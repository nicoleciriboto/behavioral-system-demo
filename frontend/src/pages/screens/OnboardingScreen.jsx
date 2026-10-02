import { BEHAVIORS, GROUPS } from '../../data/appData'
import '../../styles/screens/OnboardingScreen.css'

export default function OnboardingScreen({ setScreen, seniorMgmt }) {
  const groupCards = ['prof', 'mgr', 'lead'].map(k => ({
    ...GROUPS[k],
    items: BEHAVIORS.filter(x => x.g === k)
  }))

  return (
    <div className="onboarding-screen">
      <div className="onboarding-header">
        <div className="onboarding-container">
          <div className="onboarding-label">Introducing</div>
          <h1 className="onboarding-title">CHAI's Behaviors for Impact</h1>
          <p className="onboarding-subtitle">
            Baseline behavior standards for all CHAI staff, managers, and leaders - capturing not just what we deliver, but how we work. Give positive feedback to the colleagues who are living these behaviors.
          </p>
        </div>
      </div>

      <div className="onboarding-content">
        <div className="cards-grid">
          {groupCards.map(g => (
            <div key={g.key} className="behavior-card">
              <div className="card-header" style={{ borderTopColor: g.color }}>
                <div className="card-standard" style={{ color: g.color }}>{g.label}</div>
                <h3 className="card-title">{g.kicker}</h3>
                <p className="card-description">{g.who}</p>
              </div>
              <div className="card-behaviors">
                {g.items.map(b => (
                  <div key={b.id} className="behavior-badge">
                    {b.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="onboarding-rules">
          <div className="rules-text">
            <div className="rules-title">How it works</div>
            <div className="rules-detail">
              Pick a colleague · Choose behaviors · Share specific stories · Submit.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setScreen(seniorMgmt ? 'wall' : 'recognize')}
          >
            Get started
          </button>
        </div>
      </div>
    </div>
  )
}
