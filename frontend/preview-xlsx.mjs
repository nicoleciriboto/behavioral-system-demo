// Runs the real export code against a plausible sample dataset
// and writes the resulting workbook to disk. Run from frontend/.
import { writeFile } from 'node:fs/promises'
import exportFeedbackToXlsx, { exportFilename } from './src/utils/exportExcel.js'
import exportFeedbackToPdf, { pdfFilename } from './src/utils/exportPdf.js'

const people = [
  { id: 'p1',  name: 'Barnabas Kapfunde',    role: 'Administrative Assistant', level: 'Staff' },
  { id: 'p4',  name: 'Nqabutho Nyathi',      role: 'Technical Advisor',        level: 'Manager' },
  { id: 'p8',  name: 'Tatenda Maparo',       role: 'Senior Technical Advisor', level: 'Leader' },
  { id: 'p15', name: 'Bothwell Pindiwe',     role: 'Senior Technical Advisor', level: 'Leader' },
  { id: 'p16', name: 'Delika Rama',          role: 'Programs Manager',         level: 'Manager' },
  { id: 'p22', name: 'Ciru Wanjiru Ndichu',  role: 'Program Manager',          level: 'Manager' },
  { id: 'p29', name: 'Stanely Tapesana',     role: 'Program Manager',          level: 'Manager' },
  { id: 'p31', name: 'Nyasha Masuka',        role: 'Senior Program Manager',   level: 'Leader' },
  { id: 'p13', name: 'Charity Giyava',       role: 'Program Officer',          level: 'Staff' },
  { id: 'p11', name: 'Juliet Jokwiro',       role: 'Analyst',                  level: 'Staff' },
  { id: 'p20', name: 'Tatenda Chishapira',   role: 'Senior Analyst',           level: 'Staff' },
  { id: 'p27', name: 'Yevai Musvosvi',       role: 'Associate',                level: 'Staff' }
]

const senders = [
  { name: 'Charity Giyava',     email: 'charity@chai.org',     role: 'Program Officer',           level: 'Staff' },
  { name: 'Juliet Jokwiro',     email: 'juliet@chai.org',      role: 'Analyst',                   level: 'Staff' },
  { name: 'Delika Rama',        email: 'delika@chai.org',      role: 'Programs Manager',          level: 'Manager' },
  { name: 'Barnabas Kapfunde',  email: 'barnabas@chai.org',    role: 'Administrative Assistant',  level: 'Staff' },
  { name: 'Tatenda Chishapira', email: 'tchishapira@chai.org', role: 'Senior Analyst',            level: 'Staff' },
  { name: 'Yevai Musvosvi',     email: 'yevai@chai.org',       role: 'Associate',                 level: 'Staff' }
]

const behaviorNames = {
  integrity: 'Act with integrity', impact: 'Drive impact', curious: 'Be curious', onechai: 'Work as one CHAI',
  decisions: 'Make decisions', teams: 'Build exceptional teams', matrix: 'Lead across the matrix', accountability: 'Drive accountability',
  direction: 'Set direction', transform: 'Inspire transformation', influence: 'Influence broadly', culture: 'Shape culture'
}

const stories = {
  integrity: "Owned a reporting error before anyone flagged it — sent the correction to the ministry within the hour.",
  impact: "Pushed the team to stop optimising the wrong metric and refocus on cases averted; the pivot showed up in this quarter's numbers.",
  curious: "Kept asking why the district data spiked until we found the counting change nobody had mentioned.",
  onechai: "Bridged Programs and Finance during the budget review — turned three separate arguments into one shared plan.",
  decisions: "Made the call on the delayed shipment without waiting for the weekly meeting; supplier was retained.",
  teams: "Spent an afternoon coaching the new analyst through her first ministry presentation instead of doing it himself.",
  matrix: "Got the M&E, procurement and clinical teams into one room and unblocked the stalled campaign — no one reported to him.",
  accountability: "Held the whole team to the deadline they set themselves, kindly, and it landed on time.",
  direction: "Made it obvious which two of our fifteen workstreams actually mattered this cycle. Everyone knew where to spend their week.",
  transform: "Championed the new nomination tool at three all-hands running until scepticism turned into use.",
  influence: "Represented CHAI's position at the donor coordination meeting and came back with alignment we didn't have going in.",
  culture: "Sets the tone in every meeting — even the tense ones stay respectful."
}

const feedback = []
let ts = new Date('2026-07-20T10:00:00').getTime()
const step = () => { ts += 1000 * 60 * 60 * (2 + Math.floor(Math.random() * 12)) }

const push = (sender, recipient, behaviorIds) => {
  step()
  feedback.push({
    id: `fb_${feedback.length}`,
    createdAt: ts,
    sender,
    recipient,
    entries: behaviorIds.map(bid => ({ behaviorId: bid, behaviorName: behaviorNames[bid], story: stories[bid] }))
  })
}

const P = (id) => people.find(p => p.id === id)
push(senders[0], P('p8'),  ['direction', 'transform'])
push(senders[1], P('p8'),  ['direction', 'influence'])
push(senders[2], P('p15'), ['direction'])
push(senders[3], P('p8'),  ['direction'])
push(senders[4], P('p16'), ['matrix', 'teams'])
push(senders[5], P('p22'), ['matrix', 'decisions'])
push(senders[0], P('p16'), ['matrix'])
push(senders[1], P('p29'), ['matrix', 'accountability'])
push(senders[2], P('p22'), ['matrix'])
push(senders[3], P('p31'), ['matrix', 'direction'])
push(senders[4], P('p13'), ['onechai', 'integrity', 'impact'])
push(senders[5], P('p11'), ['onechai', 'curious'])
push(senders[0], P('p20'), ['integrity', 'impact'])
push(senders[1], P('p27'), ['integrity'])
push(senders[2], P('p13'), ['onechai'])
push(senders[3], P('p13'), ['impact'])
push(senders[4], P('p11'), ['curious'])
push(senders[5], P('p16'), ['teams', 'accountability'])
push(senders[0], P('p29'), ['teams'])
push(senders[1], P('p4'),  ['decisions'])
push(senders[2], P('p4'),  ['teams', 'accountability'])
push(senders[3], P('p15'), ['culture', 'influence'])

// Additional roster entries not in the feedback set — so "All colleagues"
// shows some with 0 stories, matching the real full-office view.
const extraPeople = [
  { id: 'p3',  name: 'Bulisani Khumalo',    role: 'Administrative Assistant', level: 'Staff' },
  { id: 'p6',  name: 'Thamsanqa Ncube',     role: 'Senior Associate',         level: 'Staff' },
  { id: 'p7',  name: 'Brian Mukono',        role: 'Accounting Analyst',       level: 'Staff' },
  { id: 'p9',  name: 'Evidence Makadzange', role: 'Associate',                level: 'Staff' },
  { id: 'p10', name: 'Patrick Mantiziba',   role: 'Senior Associate',         level: 'Staff' },
  { id: 'p12', name: 'Kenny Farai Sithole', role: 'Study Coordinator',        level: 'Staff' },
  { id: 'p14', name: 'Charles Reza',        role: 'Program Assistant',        level: 'Staff' },
  { id: 'p17', name: 'Farai Gombarago',     role: 'Finance Officer',          level: 'Staff' },
  { id: 'p18', name: 'Samuel Gwerete',      role: 'Malaria Coordinator',      level: 'Staff' },
  { id: 'p19', name: 'Sandra Garwe',        role: 'Analyst',                  level: 'Staff' },
  { id: 'p21', name: 'Charmaine Chivandire',role: 'Analyst',                  level: 'Staff' },
  { id: 'p23', name: 'Arnold Pinias',       role: 'Senior Associate',         level: 'Staff' },
  { id: 'p24', name: 'Eleanor Mataruse',    role: 'Senior Analyst',           level: 'Staff' },
  { id: 'p25', name: 'Louisa Chirenda',     role: 'Admin Coordinator',        level: 'Manager' },
  { id: 'p26', name: 'Lincoln Chivinge',    role: 'Analyst',                  level: 'Staff' },
  { id: 'p28', name: 'Chiname Nigel',       role: 'Volunteer',                level: 'Staff' },
  { id: 'p30', name: 'Kelvin Charambira',   role: 'Program Manager',          level: 'Manager' },
  { id: 'p33', name: 'Kudzai Takarinda',    role: 'Analyst',                  level: 'Staff' },
  { id: 'p34', name: 'Anna Mutisi',         role: 'Program Manager',          level: 'Manager' },
  { id: 'p35', name: 'Tapiwanashe Ciriboto',role: 'Volunteer',                level: 'Staff' },
  { id: 'p36', name: 'Precious Mutema',     role: 'Volunteer',                level: 'Staff' },
  { id: 'p37', name: 'Kufa Gangaidzo',      role: 'Volunteer',                level: 'Staff' }
]
const fullRoster = [...people, ...extraPeople]

const xlsxBlob = await exportFeedbackToXlsx(feedback, fullRoster)
const xlsxBuffer = Buffer.from(await xlsxBlob.arrayBuffer())
const xlsxPath = './preview-recognition-v6.xlsx'
await writeFile(xlsxPath, xlsxBuffer)
console.log(`Wrote ${xlsxBuffer.length} bytes to ${xlsxPath}  (app filename: ${exportFilename()})`)

const pdfBlob = await exportFeedbackToPdf(feedback, fullRoster)
const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
const pdfPath = './preview-recognition-v3.pdf'
await writeFile(pdfPath, pdfBuffer)
console.log(`Wrote ${pdfBuffer.length} bytes to ${pdfPath}  (app filename: ${pdfFilename()})`)

console.log(`Sample: ${feedback.length} submissions, ${feedback.reduce((a, f) => a + f.entries.length, 0)} stories`)
