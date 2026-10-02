import { initials } from '../utils/calculations'
import chaiLogoWhite from '../../assets/chai-logo-white.svg'
import '../styles/components/DashboardNav.css'

export default function DashboardNav({ screen, setScreen, me, seniorMgmt, superAdmin, logout }) {
  const nav = [
    { k: 'home', label: 'Home' },
    { k: 'recognize', label: 'Give recognition' },
    ...(seniorMgmt ? [{ k: 'wall', label: 'Recognition Wall' }] : []),
    ...(superAdmin ? [{ k: 'submissions', label: 'Submission tracker' }] : [])
  ]

  return (
    <header className="dashboard-nav">
      <img src={chaiLogoWhite} alt="CHAI" className="nav-logo" />

      <div className="nav-buttons">
        {nav.map(n => (
          <button
            key={n.k}
            className={`nav-btn ${screen === n.k ? 'active' : ''}`}
            onClick={() => setScreen(n.k)}
          >
            {n.label}
          </button>
        ))}
      </div>

      <div className="nav-right">
        <div className="user-info">
          <div className="user-avatar">
            {initials(me.name)}
          </div>
          <div>
            <div className="user-name">{me.name.split(' ')[0]}</div>
            <div className="user-office">{me.office}</div>
          </div>
        </div>
        {logout && (
          <button className="sign-out-btn" onClick={logout} title="Sign out">
            Sign out
          </button>
        )}
      </div>
    </header>
  )
}
