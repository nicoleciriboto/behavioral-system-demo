import ExcelJS from 'exceljs'
import { BEHAVIORS, GROUPS } from '../data/appData'

// ==== CHAI brand palette for the workbook ==================================
const CHAI_DARK_BLUE = 'FF003E78'
const CHAI_TURQUOISE = 'FF117996'
const CHAI_BLUE = 'FF2563EB'
const CHAI_GOLD = 'FFF4B71B'
const CHAI_GREEN = 'FF1ED47F'
const CHAI_MAROON = 'FF7C1220'
const ZEBRA = 'FFF7F9FB'
const WHITE = 'FFFFFFFF'
const MUTED = 'FF5A6C7C'
const SOFT_BG = 'FFF3F6F9'

// Standard → cell fill (behaviour chips inside cells).
const STANDARD_FILL = {
  prof: 'FFE0EAF3',
  mgr: 'FFD4EEF5',
  lead: 'FFDBE5FF'
}
const STANDARD_TEXT = {
  prof: CHAI_DARK_BLUE,
  mgr: CHAI_TURQUOISE,
  lead: 'FF1E40AF'
}
const STANDARD_BAR = {
  prof: CHAI_DARK_BLUE,
  mgr: CHAI_TURQUOISE,
  lead: CHAI_BLUE
}

const border = (color = 'FFE1E7ED') => ({
  top: { style: 'thin', color: { argb: color } },
  left: { style: 'thin', color: { argb: color } },
  bottom: { style: 'thin', color: { argb: color } },
  right: { style: 'thin', color: { argb: color } }
})

const applyHeaderRow = (row) => {
  row.height = 22
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: WHITE }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CHAI_DARK_BLUE } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 }
    cell.border = border()
  })
}

const zebra = (row, i) => {
  if (i % 2 === 0) return
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
  })
}

const applyBodyBorders = (row) => {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.border = border()
    if (!cell.alignment) cell.alignment = { vertical: 'top', wrapText: true }
  })
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Aggregators reused by the Overview sheet.
const aggregate = (feedback) => {
  const byBehavior = {}
  BEHAVIORS.forEach(b => { byBehavior[b.id] = 0 })

  const byGroup = { prof: 0, mgr: 0, lead: 0 }

  const byPerson = {}
  const bySender = {}

  feedback.forEach(f => {
    const rid = f.recipient?.id
    if (rid && !byPerson[rid]) {
      byPerson[rid] = { person: f.recipient, stories: 0, senders: new Set(), behaviors: new Set() }
    }
    const senderKey = f.sender?.email || f.sender?.name || 'anon'
    if (!bySender[senderKey]) {
      bySender[senderKey] = { name: f.sender?.name || 'Anonymous', stories: 0 }
    }
    f.entries.forEach(e => {
      if (byBehavior[e.behaviorId] != null) byBehavior[e.behaviorId]++
      const b = BEHAVIORS.find(x => x.id === e.behaviorId)
      if (b) byGroup[b.g]++
      if (rid) {
        byPerson[rid].stories++
        byPerson[rid].senders.add(senderKey)
        byPerson[rid].behaviors.add(e.behaviorId)
      }
      bySender[senderKey].stories++
    })
  })

  const totalStories = feedback.reduce((a, f) => a + f.entries.length, 0)
  const totalSubmissions = feedback.length
  const peopleRecognized = Object.keys(byPerson).length

  return { byBehavior, byGroup, byPerson, bySender, totalStories, totalSubmissions, peopleRecognized }
}

// ==== Sheet: Overview (the executive read) ================================
function buildOverview(wb, feedback, people = []) {
  const sheet = wb.addWorksheet('Overview', {
    properties: { tabColor: { argb: CHAI_DARK_BLUE } },
    views: [{ state: 'frozen', ySplit: 2, showGridLines: false }]
  })

  // 7 columns for the tables and KPI band; the bar-chart section fills the
  // whole width, so no extra columns are needed.
  sheet.columns = [
    { width: 4 },   // A — left gutter
    { width: 28 },  // B — name
    { width: 22 },  // C — role / behaviour col
    { width: 18 },  // D
    { width: 12 },  // E
    { width: 12 },  // F
    { width: 40 }   // G — bar chart lives here at full width
  ]

  // ------------ Title band ------------
  sheet.mergeCells('A1:G1')
  const title = sheet.getCell('A1')
  title.value = 'CHAI Behaviors for Impact — Recognition Report'
  title.font = { bold: true, size: 20, color: { argb: WHITE } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CHAI_DARK_BLUE } }
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
  sheet.getRow(1).height = 40

  sheet.mergeCells('A2:G2')
  const sub = sheet.getCell('A2')
  sub.value = `Senior management report · Generated ${new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })} · CHAI Zimbabwe`
  sub.font = { italic: true, color: { argb: MUTED }, size: 10 }
  sub.alignment = { horizontal: 'left', indent: 2, vertical: 'middle' }
  sheet.getRow(2).height = 22

  const {
    byBehavior, byGroup, byPerson, bySender,
    totalStories, totalSubmissions, peopleRecognized
  } = aggregate(feedback)

  // ------------ Row 4: KPI cards (3 across) ------------
  sheet.getRow(3).height = 8
  const kpiRow = 4
  const kpis = [
    { label: 'SUBMISSIONS',       value: totalSubmissions, color: CHAI_DARK_BLUE, colRange: ['B4', 'C6'] },
    { label: 'STORIES WRITTEN',   value: totalStories,     color: CHAI_TURQUOISE, colRange: ['D4', 'E6'] },
    { label: 'PEOPLE RECOGNIZED', value: peopleRecognized, color: CHAI_BLUE,      colRange: ['F4', 'G6'] }
  ]
  kpis.forEach(k => {
    const [tl, br] = k.colRange
    sheet.mergeCells(`${tl}:${br}`)
    const cell = sheet.getCell(tl)
    cell.value = { richText: [
      { text: k.label + '\n', font: { color: { argb: WHITE }, size: 10, bold: true } },
      { text: String(k.value), font: { color: { argb: WHITE }, size: 30, bold: true } }
    ]}
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.color } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = border(k.color)
  })
  sheet.getRow(4).height = 22
  sheet.getRow(5).height = 22
  sheet.getRow(6).height = 22

  // ------------ Sections that follow ------------
  sheet.getRow(7).height = 10
  let cursor = 8
  const sectionTitle = (row, text) => {
    sheet.mergeCells(`B${row}:G${row}`)
    const c = sheet.getCell(`B${row}`)
    c.value = text
    c.font = { bold: true, size: 13, color: { argb: CHAI_DARK_BLUE } }
    c.alignment = { vertical: 'middle', horizontal: 'left' }
    sheet.getRow(row).height = 24
    // Bottom rule
    c.border = { bottom: { style: 'medium', color: { argb: CHAI_TURQUOISE } } }
  }

  // ------------ Bar chart of behaviour recognition ------------
  sectionTitle(cursor, 'BEHAVIOUR RECOGNITION — BAR CHART')
  cursor += 1

  // Header
  const chartHeaderRow = cursor
  sheet.getCell(`B${chartHeaderRow}`).value = 'Behaviour'
  sheet.mergeCells(`C${chartHeaderRow}:F${chartHeaderRow}`)
  sheet.getCell(`C${chartHeaderRow}`).value = 'Bar (length = stories)'
  sheet.getCell(`G${chartHeaderRow}`).value = 'Stories'
  applyHeaderRow(sheet.getRow(chartHeaderRow))
  cursor += 1

  // 12 rows, sorted by count desc so the eye reads the ranking top-to-bottom.
  const chartRowsStart = cursor
  const chartRows = BEHAVIORS
    .map(b => ({ b, count: byBehavior[b.id] || 0 }))
    .sort((a, c) => c.count - a.count)

  chartRows.forEach((item, i) => {
    const rowIdx = cursor
    // Label
    const labelCell = sheet.getCell(`B${rowIdx}`)
    labelCell.value = item.b.name
    labelCell.font = { bold: true, color: { argb: STANDARD_TEXT[item.b.g] } }
    labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STANDARD_FILL[item.b.g] } }
    labelCell.border = border()

    // Bar cell — value drives the data bar; text hidden so only the bar shows.
    sheet.mergeCells(`C${rowIdx}:F${rowIdx}`)
    const barCell = sheet.getCell(`C${rowIdx}`)
    barCell.value = item.count
    barCell.font = { color: { argb: WHITE }, size: 1 }
    barCell.alignment = { vertical: 'middle', horizontal: 'left' }
    barCell.border = border()
    if (i % 2 === 1) {
      barCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
    }

    // Count on the right, large and coloured by standard for extra readability.
    const countCell = sheet.getCell(`G${rowIdx}`)
    countCell.value = item.count
    countCell.font = { bold: true, size: 13, color: { argb: STANDARD_TEXT[item.b.g] } }
    countCell.alignment = { horizontal: 'center', vertical: 'middle' }
    countCell.border = border()
    if (i % 2 === 1) {
      countCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
    }

    sheet.getRow(rowIdx).height = 26
    cursor += 1
  })

  // Data bar across all 12 rows — one shared scale.
  if (chartRows.length > 0) {
    sheet.addConditionalFormatting({
      ref: `C${chartRowsStart}:C${cursor - 1}`,
      rules: [{
        type: 'dataBar',
        priority: 1,
        cfvo: [{ type: 'min' }, { type: 'max' }],
        color: { argb: CHAI_TURQUOISE },
        gradient: false,
        showValue: false
      }]
    })
  }

  // ------------ Behaviours at a glance ------------
  cursor += 1
  sectionTitle(cursor, 'BEHAVIOURS AT A GLANCE')
  cursor += 1

  // Header row — no Visual or Share, just Standard / Behaviour / Stories
  const bHeaderRow = cursor
  sheet.getCell(`B${bHeaderRow}`).value = 'Standard'
  sheet.getCell(`C${bHeaderRow}`).value = 'Behaviour'
  sheet.mergeCells(`C${bHeaderRow}:F${bHeaderRow}`)
  sheet.getCell(`G${bHeaderRow}`).value = 'Stories'
  applyHeaderRow(sheet.getRow(bHeaderRow))
  cursor += 1

  // Body rows — group prof/mgr/lead, sort by count desc within each group
  const groupOrder = ['prof', 'mgr', 'lead']
  const behaviorRowsData = []
  groupOrder.forEach(gKey => {
    const items = BEHAVIORS.filter(b => b.g === gKey)
      .map(b => ({ b, count: byBehavior[b.id] || 0, gKey }))
      .sort((a, c) => c.count - a.count)
    items.forEach(item => behaviorRowsData.push(item))
  })

  behaviorRowsData.forEach((item, i) => {
    const rowIdx = cursor
    sheet.getCell(`B${rowIdx}`).value = GROUPS[item.gKey].label
    sheet.getCell(`C${rowIdx}`).value = item.b.name
    sheet.mergeCells(`C${rowIdx}:F${rowIdx}`)
    sheet.getCell(`G${rowIdx}`).value = item.count

    const stdCell = sheet.getCell(`B${rowIdx}`)
    stdCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STANDARD_FILL[item.gKey] } }
    stdCell.font = { bold: true, color: { argb: STANDARD_TEXT[item.gKey] }, size: 10 }
    stdCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    stdCell.border = border()

    const nameCell = sheet.getCell(`C${rowIdx}`)
    nameCell.font = { bold: true, color: { argb: CHAI_DARK_BLUE } }
    nameCell.alignment = { vertical: 'middle', wrapText: true, indent: 1 }
    nameCell.border = border()

    const countCell = sheet.getCell(`G${rowIdx}`)
    countCell.font = { bold: true, size: 12, color: { argb: STANDARD_TEXT[item.gKey] } }
    countCell.alignment = { horizontal: 'center', vertical: 'middle' }
    countCell.border = border()

    if (i % 2 === 1) {
      ;['C', 'G'].forEach(col => {
        const c = sheet.getCell(`${col}${rowIdx}`)
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
      })
    }

    sheet.getRow(rowIdx).height = 22
    cursor += 1
  })

  // Only one auto-filter per sheet — reserved for the All Colleagues table
  // below since that's the bigger scannable list.

  // ------------ All colleagues ------------
  cursor += 1
  sectionTitle(cursor, 'ALL COLLEAGUES  (ranked by stories received; everyone included)')
  cursor += 1

  const pHeaderRow = cursor
  sheet.getCell(`B${pHeaderRow}`).value = 'Colleague'
  sheet.getCell(`C${pHeaderRow}`).value = 'Role'
  sheet.mergeCells(`C${pHeaderRow}:D${pHeaderRow}`)
  sheet.getCell(`E${pHeaderRow}`).value = 'Level'
  sheet.getCell(`F${pHeaderRow}`).value = 'Stories'
  sheet.getCell(`G${pHeaderRow}`).value = 'Peers'
  applyHeaderRow(sheet.getRow(pHeaderRow))
  cursor += 1

  // Merge the recognized set with the full roster passed in, so colleagues
  // with zero stories still appear at the bottom.
  const merged = {}
  Object.values(byPerson).forEach(row => {
    merged[row.person.id] = {
      person: row.person,
      stories: row.stories,
      peers: row.senders.size
    }
  })
  people.forEach(p => {
    if (!merged[p.id]) {
      merged[p.id] = { person: p, stories: 0, peers: 0 }
    }
  })

  const allRows = Object.values(merged).sort((a, b) => (
    b.stories - a.stories || a.person.name.localeCompare(b.person.name)
  ))

  allRows.forEach((row, i) => {
    const rowIdx = cursor
    sheet.getCell(`B${rowIdx}`).value = row.person.name
    sheet.getCell(`C${rowIdx}`).value = row.person.role || ''
    sheet.mergeCells(`C${rowIdx}:D${rowIdx}`)
    sheet.getCell(`E${rowIdx}`).value = row.person.level || ''
    sheet.getCell(`F${rowIdx}`).value = row.stories
    sheet.getCell(`G${rowIdx}`).value = row.peers

    const nameCell = sheet.getCell(`B${rowIdx}`)
    nameCell.font = { bold: true, color: { argb: CHAI_DARK_BLUE } }
    nameCell.alignment = { vertical: 'middle', indent: 1 }

    sheet.getCell(`C${rowIdx}`).alignment = { vertical: 'middle', indent: 1 }
    sheet.getCell(`C${rowIdx}`).font = { color: { argb: MUTED }, size: 10 }

    sheet.getCell(`E${rowIdx}`).alignment = { vertical: 'middle', indent: 1 }
    sheet.getCell(`E${rowIdx}`).font = { color: { argb: MUTED }, size: 10 }

    const countCell = sheet.getCell(`F${rowIdx}`)
    countCell.font = { bold: true, color: row.stories === 0 ? { argb: MUTED } : { argb: CHAI_DARK_BLUE } }
    countCell.alignment = { horizontal: 'center', vertical: 'middle' }

    sheet.getCell(`G${rowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' }
    sheet.getCell(`G${rowIdx}`).font = { color: { argb: MUTED } }

    ;['B', 'C', 'E', 'F', 'G'].forEach(col => {
      const c = sheet.getCell(`${col}${rowIdx}`)
      c.border = border()
      if (i % 2 === 1) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
      }
    })

    sheet.getRow(rowIdx).height = 20
    cursor += 1
  })

  // Filter for scanning the roster
  if (allRows.length > 0) {
    sheet.autoFilter = {
      from: { row: pHeaderRow, column: 2 },
      to:   { row: pHeaderRow, column: 7 }
    }
  }
}

// ==== Sheet: Stories (flat, filterable) ====================================
function buildStories(wb, feedback) {
  const sheet = wb.addWorksheet('Stories', {
    properties: { defaultRowHeight: 20, tabColor: { argb: CHAI_TURQUOISE } },
    views: [{ state: 'frozen', ySplit: 1 }]
  })

  const headers = ['Date', 'Colleague', 'Colleague role', 'Level', 'Standard', 'Behaviour', 'Sender', 'Sender role', 'Story']
  sheet.getRow(1).values = headers
  applyHeaderRow(sheet.getRow(1))

  const rows = []
  feedback
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .forEach(f => {
      f.entries.forEach(e => {
        const behavior = BEHAVIORS.find(b => b.id === e.behaviorId)
        // The API sends the group with every entry, so prefer it over the local
        // catalogue. They agree today, but only this file would notice if they
        // stopped — and the failure was silent: an unrecognised behaviour fell
        // back to 'prof' and got exported under the wrong standard.
        const standardKey = e.behaviorGroup || behavior?.g || 'prof'
        const group = GROUPS[standardKey]
        rows.push({
          date: formatDate(f.createdAt),
          recipient: f.recipient?.name || '',
          recipientRole: f.recipient?.role || '',
          level: f.recipient?.level || '',
          standard: group?.label || standardKey,
          standardKey,
          behavior: e.behaviorName || behavior?.name || e.behaviorId,
          sender: f.sender?.name || 'Anonymous',
          senderRole: f.sender?.role || '',
          story: e.story || ''
        })
      })
    })

  rows.forEach((r, i) => {
    const excelRow = sheet.addRow([
      r.date, r.recipient, r.recipientRole, r.level,
      r.standard, r.behavior, r.sender, r.senderRole, r.story
    ])
    applyBodyBorders(excelRow)
    zebra(excelRow, i)

    const stdCell = excelRow.getCell(5)
    stdCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STANDARD_FILL[r.standardKey] || 'FFEEEEEE' } }
    stdCell.font = { bold: true, color: { argb: STANDARD_TEXT[r.standardKey] || CHAI_DARK_BLUE }, size: 10 }
    stdCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 }

    excelRow.getCell(6).font = { bold: true, color: { argb: CHAI_DARK_BLUE } }
    excelRow.getCell(6).alignment = { vertical: 'middle', wrapText: true }

    excelRow.getCell(9).font = { italic: true, color: { argb: CHAI_DARK_BLUE } }
    excelRow.getCell(9).alignment = { vertical: 'top', wrapText: true }
  })

  sheet.columns = [
    { width: 14 }, { width: 24 }, { width: 26 }, { width: 18 },
    { width: 22 }, { width: 26 }, { width: 22 }, { width: 24 }, { width: 60 }
  ]

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }
}

// ==== Sheet: By Behaviour ==================================================
function buildByBehavior(wb, feedback) {
  const sheet = wb.addWorksheet('By Behaviour', {
    properties: { defaultRowHeight: 20, tabColor: { argb: CHAI_BLUE } },
    views: [{ state: 'frozen', ySplit: 1 }]
  })

  const headers = ['Standard', 'Behaviour', 'Stories', 'Share']
  sheet.getRow(1).values = headers
  applyHeaderRow(sheet.getRow(1))

  // Seeded from the local catalogue so a behaviour nobody was recognised for
  // still gets a row at zero — "not yet" is a finding, and an absent row hides
  // it.
  const meta = {}
  const counts = {}
  BEHAVIORS.forEach(b => {
    meta[b.id] = { id: b.id, name: b.name, g: b.g }
    counts[b.id] = 0
  })

  feedback.forEach(f => f.entries.forEach(e => {
    // Previously `if (counts[e.behaviorId] != null) counts[...]++`, which
    // dropped any behaviour the database has and this file does not. That
    // understated the count *and* every share percentage, with nothing in the
    // workbook to show a row had gone missing. The submitted data decides what
    // gets counted; the catalogue only decides what starts at zero.
    const id = e.behaviorId
    if (!meta[id]) {
      meta[id] = { id, name: e.behaviorName || id, g: e.behaviorGroup || 'prof' }
      counts[id] = 0
    }
    counts[id]++
  }))

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1

  // Ordered by group, then by count desc within group. Anything carrying an
  // unknown group is appended rather than discarded.
  const groupOrder = ['prof', 'mgr', 'lead']
  const catalogue = Object.values(meta)
  const rows = [
    ...groupOrder.flatMap(gKey =>
      catalogue
        .filter(b => b.g === gKey)
        .map(b => ({ b, count: counts[b.id], gKey }))
        .sort((a, c) => c.count - a.count)
    ),
    ...catalogue
      .filter(b => !groupOrder.includes(b.g))
      .map(b => ({ b, count: counts[b.id], gKey: b.g }))
      .sort((a, c) => c.count - a.count)
  ]

  rows.forEach((r, i) => {
    const group = GROUPS[r.gKey]
    const excelRow = sheet.addRow([
      group?.label || r.gKey, r.b.name, r.count, r.count / total
    ])
    applyBodyBorders(excelRow)
    zebra(excelRow, i)

    // Fallbacks matter here: exceljs throws on an undefined `argb`, so an
    // unknown group would take the whole download down.
    const stdCell = excelRow.getCell(1)
    stdCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STANDARD_FILL[r.gKey] || 'FFEEEEEE' } }
    stdCell.font = { bold: true, color: { argb: STANDARD_TEXT[r.gKey] || CHAI_DARK_BLUE } }
    stdCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    excelRow.getCell(2).font = { bold: true, color: { argb: CHAI_DARK_BLUE } }
    excelRow.getCell(3).alignment = { horizontal: 'center' }
    excelRow.getCell(3).font = { bold: true }

    const shareCell = excelRow.getCell(4)
    shareCell.numFmt = '0.0%'
    shareCell.alignment = { horizontal: 'center' }
    shareCell.font = { color: { argb: MUTED } }
  })

  sheet.columns = [{ width: 26 }, { width: 30 }, { width: 12 }, { width: 12 }]

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }
}

// ==== Public entrypoint ====================================================
export default async function exportFeedbackToXlsx(feedback, people = []) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CHAI Behaviors for Impact'
  wb.lastModifiedBy = 'CHAI Behaviors for Impact'
  wb.created = new Date()
  wb.modified = new Date()

  buildOverview(wb, feedback, people)
  buildStories(wb, feedback)
  buildByBehavior(wb, feedback)

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

export const exportFilename = () => {
  const d = new Date()
  const iso = d.toISOString().slice(0, 10)
  return `chai-recognition-${iso}.xlsx`
}
