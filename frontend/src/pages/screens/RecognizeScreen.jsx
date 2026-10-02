import { useEffect, useMemo, useState } from 'react'
import { BEHAVIORS, GROUPS } from '../../data/appData'
import { initials } from '../../utils/calculations'
import { getPeople, saveFeedback } from '../../api/client'
import Confetti from '../../components/Confetti'
import '../../styles/screens/RecognizeScreen.css'

// Map a person's `level` to the group whose 4 behaviors they'll be recognized on.
const LEVEL_TO_GROUP = {
  Staff: 'prof',
  Manager: 'mgr',
  Leader: 'lead',
  'Senior Management': 'lead'
}

const article = (word) => (/^[aeiou]/i.test((word || '').trim()) ? 'an' : 'a')

/**
 * Must match MIN_COMMENT_WORDS / MAX_COMMENT_WORDS in the backend's nominations
 * service, and `countWords` must split the same way.
 *
 * The two live in separate packages and cannot import each other. When they last
 * disagreed — the form allowing 10 characters while the server demanded 40 — the
 * result was a green submit button followed by a rejection from the API. The
 * server is the one that decides; these exist so the form stops people before
 * they lose what they typed.
 */
const MIN_STORY_WORDS = 10
const MAX_STORY_WORDS = 40

/**
 * A payload backstop, not the rule anyone sees. Forty words cannot reach 2000
 * characters, so this only ever catches a paste of something enormous before it
 * becomes a request the server would refuse.
 */
const MAX_STORY_CHARS = 2000

/** Same rule as the backend's `countWords`: split on any run of whitespace. */
const countWords = (text) => {
  const trimmed = (text || '').trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

export default function RecognizeScreen({ me, setScreen }) {
  // Steps: 'pick' → 'behaviors' (with inline stories) → 'done'
  const [step, setStep] = useState('pick')
  const [recipient, setRecipient] = useState(null)
  const [selectedBehaviors, setSelectedBehaviors] = useState([]) // behavior ids
  const [stories, setStories] = useState({}) // { behaviorId: text }
  const [query, setQuery] = useState('')
  const [confettiKey, setConfettiKey] = useState(0)

  // People roster — GET /people. Excludes the caller and senior management.
  const [people, setPeople] = useState([])
  const [peopleError, setPeopleError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let cancelled = false
    getPeople()
      .then(list => { if (!cancelled) setPeople(list) })
      .catch(e => { if (!cancelled) setPeopleError(e.message || 'Could not load colleagues') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const filteredPeople = useMemo(() => {
    const myName = (me?.name || '').trim().toLowerCase()
    // Exclude the logged-in user and anyone at Senior Management level —
    // they're the audience for the wall, not the target of recognition.
    const eligible = people.filter(p =>
      p.name.trim().toLowerCase() !== myName && p.level !== 'Senior Management'
    )
    const q = query.trim().toLowerCase()
    if (!q) return eligible
    return eligible.filter(p =>
      `${p.name} ${p.role} ${p.office}`.toLowerCase().includes(q)
    )
  }, [people, query, me?.name])

  const groupKey = recipient ? LEVEL_TO_GROUP[recipient.level] || 'prof' : 'prof'
  const behaviorsForRecipient = BEHAVIORS.filter(b => b.g === groupKey)

  const toggleBehavior = (id) => {
    setSelectedBehaviors(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const canContinueBehaviors = selectedBehaviors.length > 0
  const allStoriesFilled = selectedBehaviors.every(id => {
    const words = countWords(stories[id])
    return words >= MIN_STORY_WORDS && words <= MAX_STORY_WORDS
  })

  const goPickAnother = () => {
    setRecipient(null)
    setSelectedBehaviors([])
    setStories({})
    setQuery('')
    setStep('pick')
  }

  const submit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      await saveFeedback({
        recipient: {
          id: recipient.id,
          name: recipient.name,
          role: recipient.role,
          office: recipient.office,
          level: recipient.level
        },
        entries: selectedBehaviors.map(id => ({
          behaviorId: id,
          behaviorName: BEHAVIORS.find(b => b.id === id).name,
          story: (stories[id] || '').trim()
        }))
      })
      setConfettiKey(k => k + 1)
      setStep('done')
    } catch (e) {
      setSubmitError(e.message || "Couldn't submit recognition. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="recognize-screen">
      {confettiKey > 0 && (
        <Confetti particles={Array.from({ length: 46 }, (_, i) => ({
          left: Math.round(Math.sin(confettiKey * 9 + i * 31) * 50 + 50) + '%',
          size: (6 + (i % 8)) + 'px',
          color: ['#6EDBCD', '#1ED47F', '#F4B71B', '#117996', '#003E78'][i % 5],
          radius: i % 3 === 0 ? '999px' : '2px',
          duration: (1.6 + (i % 5) * 0.2).toFixed(2) + 's',
          delay: ((i % 10) * 0.05).toFixed(2) + 's'
        }))} />
      )}

      {/* Step 1: pick a colleague */}
      {step === 'pick' && (
        <div className="rec-step rec-pick">
          <header className="rec-header">
            <h1 className="rec-title">Who do you want to recognize?</h1>
            <p className="rec-subtitle">
              Choose colleagues you'd like to give positive feedback to. Search by name or role.
            </p>
          </header>

          <div className="rec-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="rec-search-input"
              placeholder="Search colleagues by name or role"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button className="rec-search-clear" onClick={() => setQuery('')} aria-label="Clear">×</button>
            )}
          </div>

          {peopleError && (
            <div className="rec-people-empty" style={{ color: '#7C1220', borderColor: '#F4CBCB', background: '#FEECEC', marginBottom: 12 }}>
              {peopleError}
            </div>
          )}

          <div className="rec-people">
            {!peopleError && filteredPeople.length === 0 && people.length === 0 && (
              <div className="rec-people-empty">Loading colleagues…</div>
            )}
            {!peopleError && filteredPeople.length === 0 && people.length > 0 && (
              <div className="rec-people-empty">No colleagues match "{query}".</div>
            )}
            {filteredPeople.map(p => (
              <button
                key={p.id}
                type="button"
                className="rec-person-card"
                onClick={() => { setRecipient(p); setStep('behaviors') }}
              >
                <div className="rec-person-avatar" style={{ background: p.color }}>
                  {initials(p.name)}
                </div>
                <div className="rec-person-body">
                  <div className="rec-person-name">{p.name}</div>
                  <div className="rec-person-meta">{p.role} · {p.office}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: which behaviors */}
      {step === 'behaviors' && recipient && (
        <div className="rec-step rec-behaviors">
          <header className="rec-header">
            <button className="rec-back" onClick={goPickAnother}>← Change colleague</button>
            <h1 className="rec-title">
              Which behaviors has <span className="rec-recipient-inline">{recipient.name.split(' ')[0]}</span> shown?
            </h1>
            <p className="rec-subtitle">
              {recipient.name} is {article(recipient.role)} <strong>{recipient.role}</strong>, so these are the {GROUPS[groupKey].label.toLowerCase()}. Pick every behavior you've seen them demonstrate.
            </p>
          </header>

          <div className="rec-recipient-card">
            <div className="rec-recipient-avatar" style={{ background: recipient.color }}>
              {initials(recipient.name)}
            </div>
            <div>
              <div className="rec-recipient-name">{recipient.name}</div>
              <div className="rec-recipient-meta">{recipient.role} · {recipient.office}</div>
            </div>
          </div>

          <div className="rec-behavior-list">
            {behaviorsForRecipient.map(b => {
              const active = selectedBehaviors.includes(b.id)
              const val = stories[b.id] || ''
              const groupColor = GROUPS[b.g].color
              return (
                <div key={b.id} className={`rec-behavior-item ${active ? 'is-active' : ''}`}>
                  <button
                    type="button"
                    className={`rec-behavior-card ${active ? 'is-active' : ''}`}
                    onClick={() => toggleBehavior(b.id)}
                    style={{ borderColor: active ? groupColor : '#E1E7ED' }}
                  >
                    <div className="rec-behavior-check" style={{ background: active ? groupColor : '#F2F2F2' }}>
                      {active ? '✓' : ''}
                    </div>
                    <div className="rec-behavior-body">
                      <div className="rec-behavior-name">{b.name}</div>
                      <div className="rec-behavior-prompt">{b.direct}</div>
                    </div>
                  </button>

                  {active && (
                    <div className="rec-behavior-story" style={{ borderColor: groupColor }}>
                      <label className="rec-behavior-story-label" htmlFor={`story-${b.id}`}>
                        Describe a moment when <strong>{recipient.name.split(' ')[0]}</strong> has demonstrated <em>{b.name.toLowerCase()}</em>.
                      </label>
                      <textarea
                        id={`story-${b.id}`}
                        className="rec-story-input"
                        rows={4}
                        maxLength={MAX_STORY_CHARS}
                        placeholder={`e.g., "Last month during the ministry review, ${recipient.name.split(' ')[0]}..."`}
                        value={val}
                        onChange={(e) => setStories(prev => ({ ...prev, [b.id]: e.target.value }))}
                        autoFocus
                      />
                      {/*
                        * Counts down to the minimum, then up to the maximum, so
                        * the number on screen is always the one that matters
                        * next. Over the limit it turns red and says how many to
                        * cut, rather than silently refusing to submit.
                        */}
                      {(() => {
                        const words = countWords(val)
                        const under = words < MIN_STORY_WORDS
                        const over = words > MAX_STORY_WORDS
                        return (
                          <div className={`rec-story-count${over ? ' is-over' : ''}`}>
                            {under
                              ? `${MIN_STORY_WORDS - words} more word${MIN_STORY_WORDS - words === 1 ? '' : 's'} to submit — minimum ${MIN_STORY_WORDS}`
                              : over
                                ? `${words - MAX_STORY_WORDS} word${words - MAX_STORY_WORDS === 1 ? '' : 's'} over — maximum ${MAX_STORY_WORDS}`
                                : `${words} of ${MAX_STORY_WORDS} words · ${MAX_STORY_WORDS - words} left`}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {submitError && (
            <div className="rec-people-empty" style={{ color: '#7C1220', borderColor: '#F4CBCB', background: '#FEECEC', marginBottom: 12 }}>
              {submitError}
            </div>
          )}

          <div className="rec-actions">
            <button className="btn btn-ghost" onClick={goPickAnother} disabled={submitting}>Cancel</button>
            <button
              className="btn btn-accent"
              disabled={!canContinueBehaviors || !allStoriesFilled || submitting}
              onClick={submit}
              title={
                !canContinueBehaviors
                  ? 'Pick at least one behavior'
                  : !allStoriesFilled
                    ? `Every selected behavior needs a story of ${MIN_STORY_WORDS}–${MAX_STORY_WORDS} words`
                    : ''
              }
            >
              {submitting ? 'Submitting…' : 'Submit recognition →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: thanks */}
      {step === 'done' && recipient && (
        <div className="rec-step rec-done">
          <div className="rec-done-card">
            <div className="rec-done-badge">🎉</div>
            <h1 className="rec-done-title">Thank you!</h1>
            <p className="rec-done-subtitle">
              Your recognition for <strong>{recipient.name}</strong> has been recorded.
            </p>
            <p className="rec-done-note">
              You recognized <strong>{selectedBehaviors.length}</strong> behavior{selectedBehaviors.length === 1 ? '' : 's'}. That kind of specific, story-based feedback is what actually helps people grow.
            </p>
            <div className="rec-done-actions">
              <button className="btn btn-accent" onClick={goPickAnother}>
                Recognize someone else →
              </button>
              <button className="btn btn-ghost" onClick={() => setScreen('home')}>
                Back to home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
