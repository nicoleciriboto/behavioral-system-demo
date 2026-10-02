/**
 * Sign-in form.
 *
 * There is no Register tab. Accounts are provisioned by an administrator, who
 * issues a temporary password — self-registration would let anyone who can reach
 * the app sign in as a colleague and nominate themselves as that colleague.
 *
 * `name` is still collected because the form has always asked for it, but the
 * server ignores it: identity comes from the email and password.
 */
export default function AuthForm({
  form,
  onName,
  onEmail,
  onPassword,
  authError,
  onSubmit,
  busy = false
}) {
  return (
    <div className="auth-form-container">
      <div className="form-wrapper">
        <h2 className="form-title">Sign in to your account</h2>
        <p className="form-subtitle">Welcome back to Behaviors for Impact</p>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={onName}
              autoComplete="name"
              placeholder="Your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={onEmail}
              autoComplete="username"
              placeholder="Email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={onPassword}
              autoComplete="current-password"
              placeholder=""
            />
            <p className="form-hint">
              First time here? Use the temporary password you were sent, you'll
              be asked to set your own.
            </p>
          </div>

          {authError && <div className="error-message">{authError}</div>}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
