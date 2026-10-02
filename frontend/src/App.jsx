import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DemoSignInPage from './pages/DemoSignInPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import Dashboard from './pages/Dashboard'
import DemoBanner from './components/DemoBanner'
import { getMe, signOut } from './api/client'
// Imported from the config module rather than re-exported through `client.js`.
// Both resolve to the same constant, but this one is a module-local `const`
// folded from `import.meta.env` at build time, which is what lets the bundler
// prove the two demo components below are unreachable in a real build and drop
// the whole fixture layer. Routed through another module, it could not.
import { DEMO_MODE } from './demo/config'
import { landingPath } from './utils/landing'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)

  // Boot: ask the API who is signed in. No token means no user, and a token the
  // server rejects is cleared. Falls through to /login on any failure — which
  // includes the API being unreachable, so a server that is down looks the same
  // as being signed out until you try to sign in.
  useEffect(() => {
    let cancelled = false
    getMe()
      .then(u => { if (!cancelled) setUser(u) })
      .catch(() => { if (!cancelled) setUser(null) })
      .finally(() => { if (!cancelled) setBooting(false) })
    return () => { cancelled = true }
  }, [])

  /**
   * The password used to sign in, kept only while it is still the temporary one.
   *
   * It exists so the change-password screen can submit the current password
   * without asking for it a second time — the person typed it moments ago to get
   * here. In memory only: never written to storage, and dropped the instant the
   * password is replaced or the session ends.
   *
   * It is deliberately not the whole story. A refresh on that screen restores
   * the user from the token but not this, so the screen falls back to asking.
   */
  const [signInPassword, setSignInPassword] = useState(null)

  const handleLogin = useCallback((resolvedUser, password) => {
    setUser(resolvedUser)
    setSignInPassword(resolvedUser?.mustChangePassword ? password ?? null : null)
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut()
    setUser(null)
    setSignInPassword(null)
  }, [])

  const navigate = useNavigate()

  /**
   * A persona switch from the demo banner.
   *
   * Treated as a sign-in — same state transition, same carried password — and
   * then routed to wherever the new role lands, because that is the point of
   * switching.
   *
   * The redirect is deferred to an effect rather than called here, and that is
   * not tidiness. Calling `navigate` inline loses a race: the screen being left
   * re-renders with the new user before the new location commits, its own guard
   * fires — `/wall` sends a non-senior-manager to `/home` — and that redirect
   * replaces this one. Switching to the super admin from the Wall landed on Home
   * instead of the submission tracker.
   *
   * An effect in `App` runs after the guards' own, because effects run
   * child-first and every guard is a descendant of this component. So this one
   * is last to write, which is what makes it the one that decides.
   */
  const [pendingLanding, setPendingLanding] = useState(false)

  const handleSwitched = useCallback((nextUser, password) => {
    handleLogin(nextUser, password)
    setPendingLanding(true)
  }, [handleLogin])

  useEffect(() => {
    if (!pendingLanding || !user) return
    setPendingLanding(false)
    navigate(landingPath(user), { replace: true })
  }, [pendingLanding, user, navigate])

  /**
   * Demo chrome, wrapped around whatever the app is showing.
   *
   * One call site for the banner rather than three, so it cannot be left off
   * one of them — it has to be on the sign-in screen, the forced password
   * change, and the dashboard alike. In real mode this adds a fragment and
   * nothing else.
   */
  const withDemoChrome = (content) => (
    <>
      {DEMO_MODE && <DemoBanner user={user} onSwitched={handleSwitched} />}
      {content}
    </>
  )

  if (booting) {
    return withDemoChrome(
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: '#5a6c7c' }}>
        Loading…
      </div>
    )
  }

  const isAuth = !!user

  // Signed in but still on the temporary password. Nothing else is reachable —
  // the server refuses every other route while this is true — so the whole app
  // is replaced by the one screen that can clear it, rather than showing a
  // dashboard whose every request would fail.
  if (isAuth && user.mustChangePassword) {
    return withDemoChrome(
      <ChangePasswordPage
        user={user}
        currentPassword={signInPassword}
        onDone={handleLogin}
        onLogout={handleLogout}
      />
    )
  }

  return withDemoChrome(
    <Routes>
      <Route
        path="/login"
        element={
          isAuth
            ? <Navigate to={landingPath(user)} replace />
            // The demo signs in by picking a persona, so the password form is
            // replaced outright rather than having its fields hidden — a
            // disabled password box is still an invitation to type into one.
            : DEMO_MODE
              ? <DemoSignInPage onLogin={handleLogin} />
              : <LoginPage onLogin={handleLogin} />
        }
      />
      <Route
        path="/*"
        element={
          isAuth
            ? <Dashboard userForm={user} onLogout={handleLogout} />
            : <Navigate to="/login" replace />
        }
      />
    </Routes>
  )
}

export default App
