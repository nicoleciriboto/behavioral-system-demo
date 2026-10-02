import { useState } from 'react'
import AuthSidebar from '../components/AuthSidebar'
import { signIn } from '../api/client'
import { DEMO_LOGINS, DEMO_TEMP_PASSWORD } from '../demo/api'
import '../styles/LoginPage.css'
import '../styles/DemoSignInPage.css'

/**
 * Demo sign-in.
 *
 * Replaces `LoginPage` when `VITE_DEMO_MODE=true`, and deliberately mirrors its
 * shape — same shell, same sidebar, same form classes — so the demo reads as the
 * same product rather than a different app wearing its logo.
 *
 * One difference, and it is the point: an address signs you in, with no password
 * field. This build has no backend to verify a credential against, so a password
 * box would be theatre, and theatre that invites a reviewer to type a real
 * password into a page that cannot protect it.
 *
 * The three accepted addresses are listed under the field. A demo whose entry
 * requirement is knowledge the reviewer does not have is a demo nobody gets
 * into — and three role addresses is the shortest possible version of that hint.
 */
export default function DemoSignInPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()

    if (!email.trim()) {
      setError('Enter one of the demo addresses below.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const user = await signIn({ email })
      // The temporary password rides along exactly as the real sign-in form
      // passes the one that was typed. It matters for the single persona still
      // on a temporary password — reachable by its own address — so the
      // change-password screen can skip asking for something nobody typed.
      // `App` drops it unless `mustChangePassword` is set.
      onLogin(user, DEMO_TEMP_PASSWORD)
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-container">
      <AuthSidebar />

      <div className="auth-form-container">
        <div className="form-wrapper">
          <h2 className="form-title">Sign in to your account</h2>
          <form onSubmit={submit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                placeholder="user@gmail.com"
                autoFocus
              />
              <p className="form-hint">
                No password needed. The address decides what you can see.
              </p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="demo-accounts">
            <h3 className="demo-accounts-title">Demo accounts</h3>
            {DEMO_LOGINS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="demo-account"
                onClick={() => { setEmail(account.email); setError('') }}
                disabled={busy}
              >
                <span className="demo-account-email">{account.email}</span>
                <span className="demo-account-label">{account.label}</span>
                <span className="demo-account-blurb">{account.blurb}</span>
              </button>
            ))}
            <p className="demo-accounts-note">
              Tap one to fill the field. Recognition you give is kept in memory
              only, so a reload returns the demo to its starting data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
