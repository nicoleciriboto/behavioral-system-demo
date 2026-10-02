import chaiLogoWhite from '../../assets/chai-logo-white.svg'

export default function AuthSidebar() {
  return (
    <div className="auth-sidebar">
      <img
        src={chaiLogoWhite}
        alt="Clinton Health Access Initiative"
        className="chai-logo"
      />
      <div className="sidebar-content">
        <div className="sidebar-label">Behaviors for Impact</div>
        <h1 className="sidebar-title">Your colleagues see how you work. Now they can say so.</h1>
        <p className="sidebar-description">
          Peer recognition against CHAI's baseline behavior standards - not just <strong>what</strong> we deliver, but <strong>how</strong> we work.
        </p>
      </div>
      <div className="features-list">
        <Feature 
          number="1" 
          title="Fully anonymous"
          description="Only aggregates are ever shown. You can never give recognition to yourself."
        />
        <Feature 
          number="2" 
          title="Land in a bucket"
          description="The system reads the signal and names your strongest standard."
        />

        <Feature 
          number="3" 
          title="Recognize your colleagues"
          description="You can acknowledge as many of your colleagues as you like, anonymously."
        />
      </div>
    </div>
  )
}

function Feature({ number, title, description }) {
  return (
    <div className="feature-item">
      <div className="feature-number">{number}</div>
      <div className="feature-text">
        <div className="feature-title">{title}</div>
        <div className="feature-description">{description}</div>
      </div>
    </div>
  )
}
