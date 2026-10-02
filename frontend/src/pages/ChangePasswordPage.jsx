import { useState } from 'react'
import AuthSidebar from '../components/AuthSidebar'
import { changePassword } from '../api/client'
import '../styles/LoginPage.css'

/**
 * Shown when the account is still on the temporary password an admin issued.
 *
 * Deliberately not skippable, and not only in the UI: the server refuses every
 * other route while `mustChangePassword` is true. So there is no "remind me
 * later" — a temporary password that has passed through a chat message would
 * otherwise stay a working credential for as long as nobody got round to it.
 *
 * Reuses the sign-in shell — same `login-container`, same sidebar, same form
 * classes — so it reads as the second step of signing in rather than a separate
 * screen that happens to ask for a password.
 */
export default function ChangePasswordPage({ user, currentPassword: carried, onDone, onLogout }) {
  // The password used to sign in, if the session still has it. When it does the
  // field below is not rendered at all: it was typed moments ago on the previous
  // screen, and asking again reads as a mistake rather than a precaution.
  //
  // The server still requires and verifies it — that check has not moved. This
  // only decides who types it. After a refresh the carried value is gone, so the
  // field comes back and the screen keeps working.
  const [typedCurrent, setTypedCurrent] = useState('')
  const currentPassword = carried ?? typedCurrent
  const askForCurrent = !carried

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const MIN_LENGTH = 10
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Checked here as well as on the server, because the confirm field only
    // exists in the browser — the server never sees it and cannot compare them.
    if (newPassword !== confirmPassword) {
      setError('The two new passwords do not match.')
      return
    }

    setBusy(true)
    setError('')
    try {
      // `changePassword` re-reads the user from the server, so this is the
      // account with `mustChangePassword` already false. It has to be handed
      // back: calling `onDone()` bare passed `undefined` up as the user, which
      // cleared the session and bounced people to the sign-in page the moment
      // they did the one thing the screen exists to make them do.
      const updated = await changePassword({ currentPassword, newPassword })
      onDone(updated)
    } catch (err) {
      setError(err.message || 'Could not change your password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-container">
      <AuthSidebar />

      <div className="auth-form-container">
        <div className="form-wrapper">
          <h2 className="form-title">Set your password</h2>
          <p className="form-subtitle">
            {user?.name ? `Welcome, ${user.name.split(' ')[0]}. ` : ''}
            You're signed in with a temporary password. Choose your own to continue.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {askForCurrent && (
              <div className="form-group">
                <label htmlFor="currentPassword">Temporary password</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={typedCurrent}
                  onChange={(e) => setTypedCurrent(e.target.value)}
                  autoComplete="current-password"
                  placeholder="The one you were sent"
                  autoFocus
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder=""
                // First field on the screen when the temporary one is not asked
                // for, so the cursor starts where the typing does.
                autoFocus={!askForCurrent}
              />
              {/*
                * The requirement is stated before anything is typed, not only
                * once it has been broken. Turning red the moment it is too short
                * is what makes it noticeable — the grey version reads as
                * decoration and people miss it, then hit the disabled button
                * with no idea why.
                */}
              <p className={`form-hint${tooShort ? ' form-hint-error' : ''}`}>
                {tooShort
                  ? `${MIN_LENGTH - newPassword.length} more character${MIN_LENGTH - newPassword.length === 1 ? '' : 's'} needed — minimum ${MIN_LENGTH}`
                  : `Must be at least ${MIN_LENGTH} characters. Length matters more than symbols - a short phrase you'll remember beats Passw0rd!`}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder=""
              />
              {mismatch && <p className="form-hint form-hint-error">These don't match yet</p>}
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                busy ||
                !currentPassword ||
                newPassword.length < MIN_LENGTH ||
                newPassword !== confirmPassword
              }
            >
              {busy ? 'Saving…' : 'Save and continue'}
            </button>

            <button type="button" className="btn btn-ghost" onClick={onLogout} disabled={busy}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
