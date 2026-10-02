import { useState } from 'react'
import AuthForm from '../components/AuthForm'
import AuthSidebar from '../components/AuthSidebar'
import { signIn } from '../api/client'
import '../styles/LoginPage.css'

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleName = (e) => setForm(prev => ({ ...prev, name: e.target.value }))
  const handleEmail = (e) => setForm(prev => ({ ...prev, email: e.target.value }))
  const handlePassword = (e) => setForm(prev => ({ ...prev, password: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.email || !form.password) {
      setAuthError('Enter your email and password.')
      return
    }

    setBusy(true)
    setAuthError('')
    try {
      const user = await signIn(form)
      // The password goes up with the user so that an account still on its
      // temporary one does not have to type it again on the very next screen.
      // Held in memory for that screen only — never stored, never sent anywhere
      // except back to /auth/change-password, which verifies it.
      onLogin(user, form.password)
    } catch (err) {
      // The server deliberately returns the same message for an unknown address
      // and a wrong password, so this is passed through as-is rather than
      // interpreted — guessing at the cause here would undo that.
      setAuthError(err.message || 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-container">
      <AuthSidebar />
      <AuthForm
        form={form}
        onName={handleName}
        onEmail={handleEmail}
        onPassword={handlePassword}
        authError={authError}
        onSubmit={handleSubmit}
        busy={busy}
      />
    </div>
  )
}
