import { BEHAVIORS, GROUPS } from '../data/appData'
import '../styles/components/BehaviorBubbles.css'

/**
 * Behavior bubble chart — anonymous, org-wide.
 * Sizes each of the 12 behaviors by story count. No names or stories shown.
 *
 * Props:
 *   counts             — object { [behaviorId]: number }
 *   activeBehavior     — optional string, current filter (highlights that bubble)
 *   onSelectBehavior   — optional handler; when omitted the chart is display-only
 *   title, hint        — optional overrides for header text
 */
export default function BehaviorBubbles({
  counts = {},
  activeBehavior,
  onSelectBehavior,
  title = 'Behaviors demonstrated most',
  hint = 'Bigger bubble = more stories submitted for that behavior.'
}) {
  const maxCount = Math.max(1, ...BEHAVIORS.map(b => counts[b.id] || 0))
  const interactive = typeof onSelectBehavior === 'function'

  return (
    <section className="bubbles">
      <h2 className="bubbles-title">{title}</h2>
      {hint && <p className="bubbles-hint">{hint}</p>}
      <div className="bubbles-grid">
        {BEHAVIORS.map(b => {
          const c = counts[b.id] || 0
          const scale = Math.sqrt(c / maxCount)
          const size = Math.round(56 + scale * 110) // 56 → 166 px
          const g = GROUPS[b.g]
          const isActive = interactive && activeBehavior === b.id
          const isDim = c === 0
          const handleClick = () => {
            if (!interactive || isDim) return
            onSelectBehavior(isActive ? 'all' : b.id)
          }
          return (
            <button
              key={b.id}
              type="button"
              className={
                'bubble' +
                (isActive ? ' is-active' : '') +
                (isDim ? ' is-dim' : '') +
                (interactive ? '' : ' is-static')
              }
              style={{
                width: size,
                height: size,
                background: g.color,
                fontSize: Math.max(10, Math.round(size / 11)) + 'px'
              }}
              onClick={handleClick}
              title={`${b.name} — ${c} ${c === 1 ? 'story' : 'stories'}`}
              disabled={isDim || !interactive}
            >
              <span className="bubble-count">{c}</span>
              {size >= 80 && (
                <span className="bubble-name">{b.name}</span>
              )}
            </button>
          )
        })}
      </div>
      <div className="bubbles-legend">
        {Object.entries(GROUPS).map(([k, g]) => (
          <span key={k} className="bubbles-legend-item">
            <span className="bubbles-legend-dot" style={{ background: g.color }} />
            {g.label}
          </span>
        ))}
      </div>
    </section>
  )
}
