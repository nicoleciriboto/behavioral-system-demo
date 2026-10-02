import { useEffect, useState } from 'react'
import { BEHAVIORS, GROUPS } from '../../data/appData'
import { getMyFeedback, getBehaviorStats } from '../../api/client'
import BehaviorBubbles from '../../components/BehaviorBubbles'
import '../../styles/screens/HomeScreen.css'

export default function HomeScreen({ setScreen, me, seniorMgmt }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const [mine, setMine] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getMyFeedback()
      .then(list => { if (!cancelled) setMine(list) })
      .catch(e => { if (!cancelled) setError(e.message || 'Could not load your feedback') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [me.email])

  // Fetch org-wide behavior stats only after the user has themselves given
  // recognition. Anonymous aggregate — no names or story text.
  const hasGiven = mine.length > 0
  useEffect(() => {
    if (!hasGiven || seniorMgmt) return
    let cancelled = false
    getBehaviorStats()
      .then(s => { if (!cancelled) setStats(s) })
      .catch(() => { /* silent — chart is a bonus */ })
    return () => { cancelled = true }
  }, [hasGiven, seniorMgmt])

  const totalStories = mine.reduce((a, f) => a + f.entries.length, 0)
  const uniqueRecipients = new Set(mine.map(f => f.recipient?.id).filter(Boolean)).size

  return (
    <div className="home-screen">
      <div className="home-header">
        <div>
          <h1 className="home-title">{greeting}, {me.name.split(' ')[0]}.</h1>
          <p className="home-subtitle">
            Give recognition to colleagues who have been living CHAI's behaviors.
          </p>
        </div>
        <button
          className="btn btn-accent"
          onClick={() => setScreen('recognize')}
        >
          Give recognition
        </button>
      </div>

      {stats && !seniorMgmt && (
        <BehaviorBubbles
          counts={stats}
          title="Behaviors demonstrated most across CHAI"
          hint="Anonymous, organisation-wide. Bigger bubble means more colleagues have been recognized for that behavior."
        />
      )}

      <div className="home-cards">
        <div className="progress-card">
          <h3 className="card-title">Your recognition so far</h3>
          <div className="progress-stats">
            <div>
              <div className="stat-number">{loading ? '—' : mine.length}</div>
              <div className="stat-label">submissions</div>
            </div>
            <div>
              <div className="stat-number">{loading ? '—' : totalStories}</div>
              <div className="stat-label">stories written</div>
            </div>
            <div>
              <div className="stat-number">{loading ? '—' : uniqueRecipients}</div>
              <div className="stat-label">colleagues recognized</div>
            </div>
          </div>
          {error ? (
            <p className="progress-label" style={{ color: '#7C1220' }}>{error}</p>
          ) : loading ? (
            <p className="progress-label">Loading your recognition…</p>
          ) : mine.length === 0 ? (
            <p className="progress-label">You haven't given any recognition yet. It only takes a minute.</p>
          ) : (
            <p className="progress-label">
              Thank you for giving specific, story-based feedback - the kind that actually helps people grow.
            </p>
          )}
        </div>

        <div className="progress-card">
          <h3 className="card-title">The 12 behaviors</h3>
          <p className="card-description">Grouped by standard. Recognize colleagues against the behaviors that fit their role.</p>
          <div className="home-groups">
            {['prof', 'mgr', 'lead'].map(k => {
              const g = GROUPS[k]
              const items = BEHAVIORS.filter(b => b.g === k)
              return (
                <div key={k} className="home-group">
                  <div className="home-group-kicker" style={{ color: g.color }}>{g.kicker}</div>
                  <ul className="home-group-list">
                    {items.map(b => <li key={b.id}>{b.name}</li>)}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {seniorMgmt && (
        <div className="home-mgmt-card">
          <div>
            <div className="home-mgmt-kicker">Senior management</div>
            <div className="home-mgmt-title">See every piece of recognition on the Wall</div>
          </div>
          <button className="btn btn-primary" onClick={() => setScreen('wall')}>
            Open Recognition Wall →
          </button>
        </div>
      )}
    </div>
  )
}
