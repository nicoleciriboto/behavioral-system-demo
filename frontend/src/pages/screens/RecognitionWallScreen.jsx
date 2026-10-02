import { useEffect, useMemo, useState } from 'react'
import { BEHAVIORS, GROUPS } from '../../data/appData'
import { initials } from '../../utils/calculations'
import { getFeedback, getPeople } from '../../api/client'
import BehaviorBubbles from '../../components/BehaviorBubbles'
import '../../styles/screens/RecognitionWallScreen.css'

const formatDate = (ts) => {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Person level → the group whose behaviors they get recognized on.
const LEVEL_TO_GROUP = {
  Staff: 'prof',
  Manager: 'mgr',
  Leader: 'lead',
  'Senior Management': 'lead'
}

// Aggregate story counts from a feedback list. Used by the wall since it
// already has the full list; the Home screen pulls the same shape via
// getBehaviorStats() so staff never see individual records.
const countsFromFeedback = (feedback) => {
  const map = {}
  BEHAVIORS.forEach(b => { map[b.id] = 0 })
  feedback.forEach(f => f.entries.forEach(e => {
    if (map[e.behaviorId] != null) map[e.behaviorId]++
  }))
  return map
}

export default function RecognitionWallScreen() {
  const [query, setQuery] = useState('')
  const [behaviorFilter, setBehaviorFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [selectedPersonId, setSelectedPersonId] = useState(null)

  const [allFeedback, setAllFeedback] = useState([])
  const [allPeople, setAllPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    Promise.all([getFeedback(), getPeople().catch(() => [])])
      .then(([list, people]) => {
        if (cancelled) return
        setAllFeedback(list)
        setAllPeople(people)
      })
      .catch(e => {
        if (cancelled) return
        setLoadError(e.status === 403
          ? "You don't have access to the Recognition Wall."
          : (e.message || 'Could not load recognition.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Aggregate everything by recipient.
  // { [personId]: { person, storyCount, senderCount, behaviors:Set, feedbacks:[] } }
  const byPerson = useMemo(() => {
    const map = {}
    allFeedback.forEach(f => {
      const id = f.recipient?.id
      if (!id) return
      if (!map[id]) {
        map[id] = {
          person: f.recipient,
          storyCount: 0,
          senders: new Set(),
          behaviors: new Set(),
          feedbacks: []
        }
      }
      const row = map[id]
      row.storyCount += f.entries.length
      row.senders.add(f.sender?.email || f.sender?.name || 'anon')
      f.entries.forEach(e => row.behaviors.add(e.behaviorId))
      row.feedbacks.push(f)
    })
    return map
  }, [allFeedback])

  // Apply filters + sort descending by storyCount.
  const rankedPeople = useMemo(() => {
    const q = query.trim().toLowerCase()
    return Object.values(byPerson)
      .filter(row => {
        if (q && !`${row.person.name} ${row.person.role || ''}`.toLowerCase().includes(q)) return false
        if (groupFilter !== 'all' && LEVEL_TO_GROUP[row.person.level] !== groupFilter) return false
        if (behaviorFilter !== 'all' && !row.behaviors.has(behaviorFilter)) return false
        return true
      })
      .sort((a, b) => b.storyCount - a.storyCount || a.person.name.localeCompare(b.person.name))
  }, [byPerson, query, groupFilter, behaviorFilter])

  const selected = selectedPersonId ? byPerson[selectedPersonId] : null

  // Global stat strip stays useful for the mgmt view.
  const totalSubmissions = allFeedback.length
  const totalStories = allFeedback.reduce((a, f) => a + f.entries.length, 0)
  const peopleRecognizedCount = Object.keys(byPerson).length

  // Export state — `downloading` is null / 'excel' / 'pdf'. Each format is a
  // separate lazy-loaded bundle so senior mgmt only pays the cost when they ask.
  const [downloading, setDownloading] = useState(null)
  const [downloadError, setDownloadError] = useState('')
  const handleDownload = async (format) => {
    setDownloading(format)
    setDownloadError('')
    try {
      let blob, filename
      if (format === 'excel') {
        const mod = await import('../../utils/exportExcel')
        blob = await mod.default(allFeedback, allPeople)
        filename = mod.exportFilename()
      } else {
        const mod = await import('../../utils/exportPdf')
        blob = await mod.default(allFeedback, allPeople)
        filename = mod.pdfFilename()
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (e) {
      setDownloadError(e.message || 'Could not build the download.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="wall-screen">
      <header className="wall-header">
        <div>
          <div className="wall-kicker">Senior management view</div>
          <h1 className="wall-title">Recognition Wall</h1>
          <p className="wall-subtitle">
            {selected
              ? `All stories submitted about ${selected.person.name}.`
              : 'Every colleague who has received recognition, most-recognized first. Tap a name to see the stories.'}
          </p>
        </div>
        <div className="wall-header-right">
          <div className="wall-stats">
            <div className="wall-stat">
              <div className="wall-stat-value">{totalStories}</div>
              <div className="wall-stat-label">stories</div>
            </div>
            <div className="wall-stat">
              <div className="wall-stat-value">{peopleRecognizedCount}</div>
              <div className="wall-stat-label">people recognized</div>
            </div>
            <div className="wall-stat">
              <div className="wall-stat-value">{totalSubmissions}</div>
              <div className="wall-stat-label">submissions</div>
            </div>
          </div>
          <div className="wall-download-group">
            <button
              className="btn btn-primary wall-download"
              onClick={() => handleDownload('excel')}
              disabled={!!downloading || allFeedback.length === 0}
              title={allFeedback.length === 0 ? 'No feedback yet' : 'Download the full recognition report as an Excel file'}
            >
              {downloading === 'excel' ? 'Preparing…' : '⬇ Excel'}
            </button>
            <button
              className="btn btn-secondary wall-download"
              onClick={() => handleDownload('pdf')}
              disabled={!!downloading || allFeedback.length === 0}
              title={allFeedback.length === 0 ? 'No feedback yet' : 'Download the full recognition report as a PDF'}
            >
              {downloading === 'pdf' ? 'Preparing…' : '⬇ PDF'}
            </button>
          </div>
          {downloadError && (
            <div className="wall-download-error">{downloadError}</div>
          )}
        </div>
      </header>

      {/* ================= LIST VIEW ================= */}
      {!selected && (
        <>
          {allFeedback.length > 0 && (
            <BehaviorBubbles
              counts={countsFromFeedback(allFeedback)}
              activeBehavior={behaviorFilter}
              onSelectBehavior={setBehaviorFilter}
              hint="Bigger bubble = more stories submitted for that behavior. Tap one to filter the list below."
            />
          )}

          <section className="wall-filters">
            <div className="wall-filter-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                type="text"
                placeholder="Search by name or role"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="wall-filter-chips">
              <span className="wall-filter-label">Standard:</span>
              <button className={`chip ${groupFilter === 'all' ? 'is-active' : ''}`} onClick={() => setGroupFilter('all')}>All</button>
              {Object.entries(GROUPS).map(([k, g]) => (
                <button
                  key={k}
                  className={`chip ${groupFilter === k ? 'is-active' : ''}`}
                  style={{ borderColor: groupFilter === k ? g.color : undefined, color: groupFilter === k ? g.color : undefined }}
                  onClick={() => setGroupFilter(k)}
                >
                  {g.short}
                </button>
              ))}
            </div>

            <div className="wall-filter-chips">
              <span className="wall-filter-label">Behavior:</span>
              <select className="wall-select" value={behaviorFilter} onChange={(e) => setBehaviorFilter(e.target.value)}>
                <option value="all">All behaviors</option>
                {BEHAVIORS.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="wall-list">
            {loading && <div className="wall-empty">Loading recognition…</div>}
            {loadError && !loading && (
              <div className="wall-empty" style={{ color: '#7C1220' }}>{loadError}</div>
            )}
            {!loading && !loadError && rankedPeople.length === 0 && (
              <div className="wall-empty">
                {allFeedback.length === 0
                  ? "No recognition submitted yet. When colleagues start giving feedback, it will appear here."
                  : "No colleagues match those filters."}
              </div>
            )}
            {rankedPeople.map((row) => {
              const g = GROUPS[LEVEL_TO_GROUP[row.person.level] || 'prof']
              return (
                <button
                  key={row.person.id}
                  type="button"
                  className="wall-row"
                  onClick={() => setSelectedPersonId(row.person.id)}
                >
                  <div className="wall-row-header">
                    <div className="wall-row-avatar" style={{ background: row.person.color || '#003E78' }}>
                      {initials(row.person.name)}
                    </div>
                    <div className="wall-row-body">
                      <div className="wall-row-name">{row.person.name}</div>
                      <div className="wall-row-meta">
                        {row.person.role}{row.person.office ? ` · ${row.person.office}` : ''}
                      </div>
                    </div>
                    <div className="wall-row-stats">
                      <div className="wall-row-count" style={{ color: g.color }}>{row.storyCount}</div>
                      <div className="wall-row-count-label">{row.storyCount === 1 ? 'story' : 'stories'}</div>
                      <div className="wall-row-senders">from {row.senders.size} {row.senders.size === 1 ? 'peer' : 'peers'}</div>
                    </div>
                    <div className="wall-row-arrow">→</div>
                  </div>

                  <div className="wall-row-divider" />

                  <div className="wall-row-behaviors">
                    {Array.from(row.behaviors).map(bid => {
                      const b = BEHAVIORS.find(x => x.id === bid)
                      if (!b) return null
                      const bg = GROUPS[b.g].color
                      return (
                        <span key={bid} className="wall-row-behavior" style={{ background: bg }}>
                          {b.name}
                        </span>
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </section>
        </>
      )}

      {/* ================= DETAIL VIEW ================= */}
      {selected && (
        <section className="wall-detail">
          <button className="wall-back" onClick={() => setSelectedPersonId(null)}>← Back to everyone</button>

          <div className="wall-detail-card">
            <div className="wall-detail-avatar" style={{ background: selected.person.color || '#003E78' }}>
              {initials(selected.person.name)}
            </div>
            <div className="wall-detail-body">
              <div className="wall-detail-name">{selected.person.name}</div>
              <div className="wall-detail-meta">
                {selected.person.role}{selected.person.office ? ` · ${selected.person.office}` : ''}
              </div>
            </div>
            <div className="wall-detail-stats">
              <div>
                <div className="wall-detail-num">{selected.storyCount}</div>
                <div className="wall-detail-num-label">stories</div>
              </div>
              <div>
                <div className="wall-detail-num">{selected.senders.size}</div>
                <div className="wall-detail-num-label">peers</div>
              </div>
              <div>
                <div className="wall-detail-num">{selected.behaviors.size}</div>
                <div className="wall-detail-num-label">behaviors</div>
              </div>
            </div>
          </div>

          {/* Group all stories by behavior for analytical scanning. */}
          <div className="wall-detail-behaviors">
            {(() => {
              const byBehavior = {}
              selected.feedbacks.forEach(f => {
                f.entries.forEach(e => {
                  byBehavior[e.behaviorId] = byBehavior[e.behaviorId] || []
                  byBehavior[e.behaviorId].push({
                    story: e.story,
                    sender: f.sender,
                    createdAt: f.createdAt
                  })
                })
              })
              // Order behavior groups by count desc.
              const ordered = Object.entries(byBehavior).sort((a, b) => b[1].length - a[1].length)
              return ordered.map(([bid, stories]) => {
                const b = BEHAVIORS.find(x => x.id === bid)
                if (!b) return null
                const g = GROUPS[b.g]
                return (
                  <div key={bid} className="wall-detail-group">
                    <div className="wall-detail-group-header">
                      <span className="wall-detail-group-tag" style={{ background: g.color }}>
                        {b.name}
                      </span>
                      <span className="wall-detail-group-count">
                        {stories.length} {stories.length === 1 ? 'story' : 'stories'}
                      </span>
                    </div>
                    <div className="wall-detail-group-stories">
                      {stories
                        .slice()
                        .sort((a, c) => c.createdAt - a.createdAt)
                        .map((s, i) => (
                          <div key={i} className="wall-detail-story">
                            <p className="wall-detail-story-text">"{s.story}"</p>
                            <div className="wall-detail-story-meta">
                              — {s.sender?.name || 'Anonymous'} · {formatDate(s.createdAt)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </section>
      )}
    </div>
  )
}
