/**
 * Submission tracker — the super admin's view of participation.
 *
 * It answers one question: who has given recognition this month, and who has
 * not. It deliberately shows nothing about *what* anyone wrote or *who* they
 * recognised — the super admin cannot read a comment anywhere else in this app,
 * and this screen is not the exception. The endpoint behind it returns no story
 * text at all, so there is nothing here to leak by accident.
 *
 * The people who have *not* submitted come first. They are the ones the screen
 * exists to find; the submitted list is confirmation, not the point.
 */

import { useEffect, useMemo, useState } from 'react'
import { getSubmissionStatus } from '../../api/client'
import { initials } from '../../utils/calculations'
import '../../styles/screens/SubmissionStatusScreen.css'

const ALL_PERIODS = 'all'

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

/** "2026-09" → "September 2026". */
const formatPeriod = (key) => {
  if (key === ALL_PERIODS) return 'All time'
  const [year, month] = key.split('-')
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

const ROLE_LABEL = {
  SUPER_ADMIN: 'Super admin',
  SENIOR_MGMT: 'Senior management'
}

export default function SubmissionStatusScreen() {
  // null means "whatever the server defaults to", which is the current month.
  // It is deliberately not replaced with the server's answer once that arrives:
  // writing it back would re-run the effect and fetch the same data twice. The
  // selector reads through to `data` for its displayed value instead.
  const [period, setPeriod] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    getSubmissionStatus(period)
      .then((result) => {
        if (cancelled) return
        setData(result)
      })
      .catch((e) => {
        if (cancelled) return
        setLoadError(
          e.status === 403
            ? 'The submission tracker is available to the super admin only.'
            : e.message || 'Could not load submission status.'
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period])

  const { pending, submitted } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = (data?.people || []).filter((p) =>
      q ? `${p.name} ${p.role} ${p.team} ${p.email}`.toLowerCase().includes(q) : true
    )
    return {
      pending: rows.filter((p) => !p.submitted),
      submitted: rows.filter((p) => p.submitted)
    }
  }, [data, query])

  // Chasing people is the reason this screen exists, and retyping addresses out
  // of a list is where that falls down. Copies to the clipboard only — nothing
  // is sent from here.
  const copyPendingEmails = async () => {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(pending.map((p) => p.email).join('; '))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Its own state, not `loadError`. A blocked clipboard is a failed button
      // press, and blanking the list the admin came here to read over it would
      // be a worse outcome than the one it is reporting.
      setCopyError('Your browser blocked the clipboard. Select the addresses and copy them.')
    }
  }

  const totals = data?.totals
  const periodLabel = data ? formatPeriod(data.period.key) : ''

  return (
    <div className="subs-screen">
      <header className="subs-header">
        <div>
          <div className="subs-kicker">Super admin view</div>
          <h1 className="subs-title">Submission tracker</h1>
          <p className="subs-subtitle">
            {data?.period.key === ALL_PERIODS
              ? 'Who has ever given recognition, and who has not yet. '
              : `Who gave recognition in ${periodLabel}, and who did not. `}
            Names and counts only — never what anyone wrote, or who they wrote
            it about.
          </p>
        </div>

        {totals && (
          <div className="subs-stats">
            <div className="subs-stat is-pending">
              <div className="subs-stat-value">{totals.notSubmitted}</div>
              <div className="subs-stat-label">not yet</div>
            </div>
            <div className="subs-stat is-done">
              <div className="subs-stat-value">{totals.submitted}</div>
              <div className="subs-stat-label">submitted</div>
            </div>
            <div className="subs-stat">
              <div className="subs-stat-value">{totals.people}</div>
              <div className="subs-stat-label">people</div>
            </div>
            <div className="subs-stat">
              <div className="subs-stat-value">{totals.stories}</div>
              <div className="subs-stat-label">stories</div>
            </div>
          </div>
        )}
      </header>

      <section className="subs-controls">
        <div className="subs-search">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, role, team or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <label className="subs-period">
          <span>Period</span>
          <select
            value={period ?? data?.period.key ?? ''}
            onChange={(e) => setPeriod(e.target.value)}
            disabled={!data}
          >
            {/* First because it is the default: "has this person ever taken
                part" is the question, and a single month answers a narrower
                one. */}
            <option value={ALL_PERIODS}>All time</option>
            {(data?.periods || []).map((key) => (
              <option key={key} value={key}>
                {formatPeriod(key)}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading && <div className="subs-empty">Loading submission status…</div>}
      {loadError && !loading && <div className="subs-error">{loadError}</div>}

      {!loading && !loadError && data && (
        <>
          <section className="subs-group">
            <div className="subs-group-header">
              <h2 className="subs-group-title">
                Not yet submitted
                <span className="subs-group-count">{pending.length}</span>
              </h2>
              {pending.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary subs-copy"
                  onClick={copyPendingEmails}
                  title="Copy these email addresses to the clipboard"
                >
                  {copied ? '✓ Copied' : 'Copy email addresses'}
                </button>
              )}
            </div>

            {copyError && <div className="subs-copy-error">{copyError}</div>}

            {pending.length === 0 ? (
              <div className="subs-empty">
                {query
                  ? 'Nobody outstanding matches that search.'
                  : 'Everyone has submitted. Nothing to chase.'}
              </div>
            ) : (
              <ul className="subs-list">
                {pending.map((person) => (
                  <li key={person.id} className="subs-row is-pending">
                    <div className="subs-avatar">{initials(person.name)}</div>
                    <div className="subs-row-body">
                      <div className="subs-row-name">
                        {person.name}
                        {ROLE_LABEL[person.appRole] && (
                          <span className="subs-role-tag">{ROLE_LABEL[person.appRole]}</span>
                        )}
                      </div>
                      <div className="subs-row-meta">
                        {person.role} · {person.team}
                      </div>
                      <div className="subs-row-email">{person.email}</div>
                    </div>
                    <div className="subs-row-status">
                      {person.everSubmittedAt ? (
                        <>
                          <span className="subs-pill is-quiet">Quiet this period</span>
                          <div className="subs-row-when">
                            last submitted {formatDate(person.everSubmittedAt)}
                          </div>
                        </>
                      ) : (
                        <span className="subs-pill is-never">Never submitted</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="subs-group">
            <div className="subs-group-header">
              <h2 className="subs-group-title">
                Submitted
                <span className="subs-group-count">{submitted.length}</span>
              </h2>
            </div>

            {submitted.length === 0 ? (
              <div className="subs-empty">
                {query
                  ? 'Nobody who submitted matches that search.'
                  : 'No recognition has been given in this period yet.'}
              </div>
            ) : (
              <ul className="subs-list">
                {submitted.map((person) => (
                  <li key={person.id} className="subs-row is-done">
                    <div className="subs-avatar">{initials(person.name)}</div>
                    <div className="subs-row-body">
                      <div className="subs-row-name">
                        {person.name}
                        {ROLE_LABEL[person.appRole] && (
                          <span className="subs-role-tag">{ROLE_LABEL[person.appRole]}</span>
                        )}
                      </div>
                      <div className="subs-row-meta">
                        {person.role} · {person.team}
                      </div>
                      <div className="subs-row-email">{person.email}</div>
                    </div>
                    <div className="subs-row-status">
                      <span className="subs-pill is-done">
                        {plural(person.submissions, 'submission', 'submissions')}
                      </span>
                      <div className="subs-row-when">
                        {plural(person.stories, 'story', 'stories')}
                        {person.lastSubmittedAt
                          ? ` · last ${formatDate(person.lastSubmittedAt)}`
                          : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
