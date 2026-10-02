import { useEffect, useRef, useState } from 'react'
import { signIn } from '../api/client'
import { DEMO_LOGINS, DEMO_TEMP_PASSWORD } from '../demo/api'
import '../styles/components/DemoBanner.css'

/**
 * The demo-mode banner.
 *
 * Rendered once, above the router, so it is on every screen — sign-in, the
 * forced password change, and all five dashboard screens — rather than being
 * added per page and forgotten on one of them.
 *
 * It states plainly that the data is invented. The reason this matters more than
 * it looks: the roster is sixteen plausible Zimbabwean names attached to
 * invented quotes about each other's conduct. A reviewer who assumed those were
 * real colleagues would be reading fabricated appraisals of named people. So the
 * banner is not decoration and is not dismissible.
 *
 * In normal document flow rather than fixed, deliberately: the dashboard's own
 * header is sticky, and a fixed bar would either cover it or need the rest of
 * the app shifted down to compensate.
 *
 * The role switch lives here rather than in `App.jsx` so that nothing in the app
 * shell imports from `src/demo/`. App references this component and the sign-in
 * page, both only inside `DEMO_MODE &&` guards, which keeps the whole fixture
 * layer droppable from a production build.
 */
export default function DemoBanner({ user, onSwitched }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // A click anywhere else closes the menu. Without this it stays open behind
  // whatever the reviewer clicked next, which on a narrow window covers the nav.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const ROLE_LABEL = {
    MEMBER: 'Member',
    SENIOR_MGMT: 'Senior management',
    SUPER_ADMIN: 'Super admin'
  }

  /**
   * Switching role is a sign-in, so it goes through `signIn` rather than poking
   * at state — the demo store has one notion of who is signed in, and two ways
   * to set it would be two ways to disagree.
   *
   * By `personaId`, not by address: the switcher names the account it wants and
   * has no reason to go back through a lookup that can fail.
   */
  const pick = async (account) => {
    setOpen(false)
    if (account.personaId === user.id) return
    try {
      const next = await signIn({ personaId: account.personaId })
      onSwitched(next, DEMO_TEMP_PASSWORD)
    } catch {
      // Nothing to recover from — the account list is a static array, so the
      // only way this fails is a bug, and the current session is still valid.
    }
  }

  return (
    <div className="demo-banner" role="status">
     

      <span className="demo-banner-text">
        <strong>Demo mode </strong>{' '}
      </span>

      {user && (
        <div className="demo-banner-switch" ref={menuRef}>
          <button
            type="button"
            className="demo-banner-button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            Viewing as {ROLE_LABEL[user.appRole] || 'Member'}
            <span className="demo-banner-caret" aria-hidden="true">▾</span>
          </button>

          {open && (
            /* The three sign-in accounts, not the whole roster. These are the
               three dashboards, which is the only reason to switch. */
            <ul className="demo-banner-menu" role="listbox">
              {DEMO_LOGINS.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={account.personaId === user.id}
                    className={`demo-banner-option ${account.personaId === user.id ? 'is-current' : ''}`}
                    onClick={() => pick(account)}
                  >
                    <span className="demo-banner-option-name">{account.label}</span>
                    <span className="demo-banner-option-role">{account.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
