import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { hierarchy, pack } from 'd3-hierarchy'
import { BEHAVIORS, GROUPS } from '../data/appData'

// ==== CHAI palette in RGB tuples for jsPDF =================================
const CHAI_DARK_BLUE = [0, 62, 120]
const CHAI_TURQUOISE = [17, 121, 150]
const CHAI_BLUE = [37, 99, 235]
const MUTED = [90, 108, 124]
const SOFT_BG = [243, 246, 249]
const ZEBRA = [247, 249, 251]
const WHITE = [255, 255, 255]
const BORDER = [225, 231, 237]

const STANDARD_FILL = {
  prof: [224, 234, 243],
  mgr:  [212, 238, 245],
  lead: [219, 229, 255]
}
const STANDARD_TEXT = {
  prof: CHAI_DARK_BLUE,
  mgr:  CHAI_TURQUOISE,
  lead: [30, 64, 175]
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ==== Aggregation (mirrors exportExcel.js) =================================
const aggregate = (feedback) => {
  // Seeded from the local catalogue so a behaviour nobody was named for still
  // reports zero, then counted from the entries themselves — including any
  // behaviour this file does not know about, whose name and group the API sends
  // alongside it. The old `!= null` guard dropped those silently, understating
  // the tally with nothing in the document to show a row had gone missing.
  const byBehavior = {}
  const behaviorMeta = {}
  BEHAVIORS.forEach(b => {
    byBehavior[b.id] = 0
    behaviorMeta[b.id] = { id: b.id, name: b.name, g: b.g }
  })
  const byPerson = {}
  feedback.forEach(f => {
    const rid = f.recipient?.id
    if (rid && !byPerson[rid]) {
      byPerson[rid] = { person: f.recipient, stories: 0, senders: new Set(), behaviors: new Set() }
    }
    f.entries.forEach(e => {
      if (byBehavior[e.behaviorId] == null) {
        byBehavior[e.behaviorId] = 0
        behaviorMeta[e.behaviorId] = {
          id: e.behaviorId,
          name: e.behaviorName || e.behaviorId,
          g: e.behaviorGroup || 'prof'
        }
      }
      byBehavior[e.behaviorId]++
      if (rid) {
        byPerson[rid].stories++
        byPerson[rid].senders.add(f.sender?.email || f.sender?.name || 'anon')
        byPerson[rid].behaviors.add(e.behaviorId)
      }
    })
  })
  const totalStories = feedback.reduce((a, f) => a + f.entries.length, 0)
  const totalSubmissions = feedback.length
  const peopleRecognized = Object.keys(byPerson).length
  return { byBehavior, behaviorMeta, byPerson, totalStories, totalSubmissions, peopleRecognized }
}

// ==== PDF builder ==========================================================
export default async function exportFeedbackToPdf(feedback, people = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()   // 210
  const pageH = doc.internal.pageSize.getHeight()  // 297
  const margin = 12

  const {
    byBehavior, behaviorMeta, byPerson,
    totalStories, totalSubmissions, peopleRecognized
  } = aggregate(feedback)

  // ---- Header band ----
  doc.setFillColor(...CHAI_DARK_BLUE)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('CHAI Behaviors for Impact: Recognition Report', margin, 14)

  doc.setTextColor(...MUTED)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.text(
    `Senior management report  ·  Generated ${new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}  ·  CHAI Zimbabwe`,
    margin,
    28
  )

  // ---- KPI cards ----
  let y = 34
  const cardW = (pageW - margin * 2 - 8) / 3
  const cardH = 22
  const kpis = [
    { label: 'SUBMISSIONS',       value: totalSubmissions, color: CHAI_DARK_BLUE },
    { label: 'STORIES WRITTEN',   value: totalStories,     color: CHAI_TURQUOISE },
    { label: 'PEOPLE RECOGNIZED', value: peopleRecognized, color: CHAI_BLUE }
  ]
  kpis.forEach((k, i) => {
    const x = margin + i * (cardW + 4)
    doc.setFillColor(...k.color)
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F')
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(k.label, x + 5, y + 7)
    doc.setFontSize(22)
    doc.text(String(k.value), x + 5, y + 18)
  })
  y += cardH + 10

  // ---- Section: bar chart ----
  const sectionTitle = (text) => {
    doc.setTextColor(...CHAI_DARK_BLUE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(text, margin, y)
    doc.setDrawColor(...CHAI_TURQUOISE)
    doc.setLineWidth(0.6)
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5)
    y += 7
  }

  sectionTitle('BEHAVIOURS DEMONSTRATED MOST')

  // Card container for the bubble chart
  const bcX = margin
  const bcY = y
  const bcW = pageW - margin * 2
  const bcH = 100  // mm
  const bcPad = 6

  // Card background + border (matches the app's white cards on the wall)
  doc.setFillColor(...WHITE)
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.4)
  doc.roundedRect(bcX, bcY, bcW, bcH, 3, 3, 'FD')

  // Circle-packing layout inside the card interior.
  // d3-hierarchy sizes circles by .value and packs them tightly.
  // Zero-count behaviours get a tiny floor value so they still appear.
  const packRoot = hierarchy({
    children: BEHAVIORS.map(b => ({
      id: b.id,
      name: b.name,
      g: b.g,
      count: byBehavior[b.id] || 0,
      value: (byBehavior[b.id] || 0) + 0.4 // floor so zero-count still packs
    }))
  })
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value)

  const packLayout = pack()
    .size([bcW - bcPad * 2, bcH - bcPad * 2])
    .padding(2)
  packLayout(packRoot)

  packRoot.children.forEach(node => {
    const cx = bcX + bcPad + node.x
    const cy = bcY + bcPad + node.y
    const r = node.r
    const d = node.data
    const isZero = d.count === 0
    const color = STANDARD_TEXT[d.g]

    if (isZero) {
      // Dim outline for uncovered behaviours
      doc.setFillColor(...SOFT_BG)
      doc.setDrawColor(...BORDER)
      doc.setLineWidth(0.3)
      doc.circle(cx, cy, r, 'FD')
    } else {
      doc.setFillColor(...color)
      doc.circle(cx, cy, r, 'F')
    }

    // Text inside — behaviour name and count, sized to bubble.
    // Skip if the circle is really small (label would overflow).
    if (r < 4) return

    const nameFontSize = Math.max(5, Math.min(11, r * 0.55))
    const countFontSize = Math.max(6, Math.min(14, r * 0.7))

    doc.setTextColor(...(isZero ? MUTED : WHITE))
    doc.setFont('helvetica', 'bold')

    // Wrap the behaviour name to fit inside the circle horizontally.
    doc.setFontSize(nameFontSize)
    const maxTextW = r * 1.6
    const nameLines = doc.splitTextToSize(d.name, maxTextW)
    // Draw up to 2 lines so tall labels don't overflow small bubbles.
    const linesToDraw = nameLines.slice(0, 2)
    const nameLineHeight = nameFontSize * 0.42 // in mm-ish
    const nameBlockH = linesToDraw.length * nameLineHeight
    const countH = countFontSize * 0.42

    // Vertically center the (name block + count) stack.
    const totalH = nameBlockH + countH + 0.5
    let textY = cy - totalH / 2 + nameLineHeight

    linesToDraw.forEach(line => {
      doc.text(line, cx, textY, { align: 'center' })
      textY += nameLineHeight
    })

    // Count below the name.
    doc.setFontSize(countFontSize)
    doc.text(String(d.count), cx, textY + countH * 0.7, { align: 'center' })
  })

  y = bcY + bcH + 5

  // Legend — sits below the card
  doc.setFontSize(8)
  const legendItems = [
    { label: GROUPS.prof.label, color: STANDARD_TEXT.prof },
    { label: GROUPS.mgr.label,  color: STANDARD_TEXT.mgr },
    { label: GROUPS.lead.label, color: STANDARD_TEXT.lead }
  ]
  const legendGap = 55
  const legendStartX = (pageW - legendGap * legendItems.length) / 2
  legendItems.forEach((item, i) => {
    const x = legendStartX + i * legendGap
    doc.setFillColor(...item.color)
    doc.circle(x, y, 2, 'F')
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.text(item.label, x + 4, y + 1)
  })
  y += 8

  // ---- Section: Behaviours at a glance ----
  sectionTitle('BEHAVIOURS AT A GLANCE')

  // Built from `behaviorMeta` rather than BEHAVIORS, so a behaviour the API
  // returned but this file does not know about still gets a row. Unknown groups
  // are appended after the three standards instead of vanishing.
  const groupOrder = ['prof', 'mgr', 'lead']
  const catalogue = Object.values(behaviorMeta)
  const behaviourRows = [
    ...groupOrder.flatMap(g =>
      catalogue.filter(b => b.g === g)
        .map(b => ({ b, count: byBehavior[b.id] || 0 }))
        .sort((a, c) => c.count - a.count)
    ),
    ...catalogue.filter(b => !groupOrder.includes(b.g))
      .map(b => ({ b, count: byBehavior[b.id] || 0 }))
      .sort((a, c) => c.count - a.count)
  ]
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Standard', 'Behaviour', 'Stories']],
    body: behaviourRows.map(r => [
      GROUPS[r.b.g]?.label || r.b.g,
      r.b.name,
      r.count
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: CHAI_DARK_BLUE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    bodyStyles: { fontSize: 9, textColor: CHAI_DARK_BLUE, lineColor: BORDER },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 25 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const g = behaviourRows[data.row.index].b.g
        data.cell.styles.fillColor = STANDARD_FILL[g]
        data.cell.styles.textColor = STANDARD_TEXT[g]
      }
    }
  })
  y = doc.lastAutoTable.finalY + 8

  // ---- Section: All colleagues (may spill to next page) ----
  if (y > pageH - 60) {
    doc.addPage()
    y = margin
  }
  sectionTitle('ALL COLLEAGUES  (ranked by stories received)')

  const merged = {}
  Object.values(byPerson).forEach(row => {
    merged[row.person.id] = {
      person: row.person, stories: row.stories, peers: row.senders.size
    }
  })
  people.forEach(p => {
    if (!merged[p.id]) merged[p.id] = { person: p, stories: 0, peers: 0 }
  })
  const allRows = Object.values(merged).sort((a, b) => (
    b.stories - a.stories || a.person.name.localeCompare(b.person.name)
  ))

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Colleague', 'Role', 'Level', 'Stories', 'Peers']],
    body: allRows.map(r => [
      r.person.name,
      r.person.role || '',
      r.person.level || '',
      r.stories,
      r.peers
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: CHAI_DARK_BLUE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    bodyStyles: { fontSize: 9, textColor: CHAI_DARK_BLUE, lineColor: BORDER },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { textColor: MUTED, fontSize: 8.5 },
      2: { textColor: MUTED, fontSize: 8.5, cellWidth: 28 },
      3: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 20, textColor: MUTED }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        if (allRows[data.row.index].stories === 0) {
          data.cell.styles.textColor = MUTED
          data.cell.styles.fontStyle = 'normal'
        }
      }
    }
  })
  y = doc.lastAutoTable.finalY + 8

  // ---- Section: Stories (page 2+) ----
  doc.addPage()
  y = margin
  sectionTitle('STORIES')

  const storyRows = []
  feedback
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .forEach(f => {
      f.entries.forEach(e => {
        const b = BEHAVIORS.find(x => x.id === e.behaviorId)
        // Server-sent group wins over the local catalogue, same as the Excel
        // export — otherwise an unrecognised behaviour lands under a blank
        // standard with no indication anything was missing.
        const gKey = e.behaviorGroup || b?.g
        const gLabel = gKey ? (GROUPS[gKey]?.label || gKey) : ''
        storyRows.push([
          formatDate(f.createdAt),
          f.recipient?.name || '',
          gLabel,
          e.behaviorName || b?.name || e.behaviorId,
          f.sender?.name || 'Anonymous',
          e.story || ''
        ])
      })
    })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Date', 'Colleague', 'Standard', 'Behaviour', 'Sender', 'Story']],
    body: storyRows,
    theme: 'grid',
    headStyles: {
      fillColor: CHAI_DARK_BLUE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: { fontSize: 8.5, textColor: CHAI_DARK_BLUE, lineColor: BORDER, valign: 'top' },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 30, fontStyle: 'bold' },
      2: { cellWidth: 30, fontSize: 8, textColor: MUTED },
      3: { cellWidth: 30, fontStyle: 'bold' },
      4: { cellWidth: 25, textColor: MUTED, fontSize: 8 },
      5: { fontStyle: 'italic', textColor: CHAI_DARK_BLUE }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const label = data.cell.raw
        const g = Object.values(GROUPS).find(x => x.label === label)
        if (g) {
          const key = g.key
          data.cell.styles.fillColor = STANDARD_FILL[key]
          data.cell.styles.textColor = STANDARD_TEXT[key]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    }
  })

  // ---- Footer on every page ----
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`CHAI Behaviors for Impact  ·  Confidential`, margin, pageH - 6)
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 6, { align: 'right' })
  }

  // Return as Blob for download
  return doc.output('blob')
}

export const pdfFilename = () => {
  const d = new Date()
  const iso = d.toISOString().slice(0, 10)
  return `chai-recognition-${iso}.pdf`
}
