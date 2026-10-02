/**
 * Frontend data-layer client.
 *
 * Every backend call goes through here. There are two modes, and the mode is
 * decided once at module load:
 *
 *   - `VITE_DEMO_MODE=true` → fixtures, from `src/demo/`. No network at all.
 *   - otherwise             → the API, and `VITE_API_URL` is required.
 *
 * A demo mode existed here once before and was removed. Worth being precise
 * about why, because it was not the fixtures:
 *
 * 1. It triggered on `VITE_API_URL` being *unset*, so forgetting to configure
 *    the API was indistinguishable from asking for mock data. The app would
 *    render a dashboard from a stale `localStorage` user with no server running
 *    anywhere, and nothing said so.
 * 2. A missing configuration value should be loud.
 *
 * Both of those are about the trigger. So the trigger is now an explicit flag
 * that does nothing by accident: with `VITE_DEMO_MODE` absent or set to anything
 * other than `true`, a missing `VITE_API_URL` still throws at module load,
 * exactly as loudly as before.
 *
 * The real paths below are untouched — every demo branch is a single early
 * return at the top of a function, so what runs in production is what ran
 * before this file gained a second mode.
 */

import { DEMO_MODE } from '../demo/config'

/**
 * Named imports with aliases, rather than `import * as demo`.
 *
 * It reads worse and it is twelve lines instead of one, but a namespace import
 * is retained by the bundler even when every property access on it is in a
 * branch that folds away — so the fixture roster, the seeded stories and the
 * demo store all ended up in production builds. Named bindings let the dead
 * branches below take their imports with them, and a real build contains none
 * of this.
 */
import {
  signIn as demoSignIn,
  signOut as demoSignOut,
  getMe as demoGetMe,
  changePassword as demoChangePassword,
  getPeople as demoGetPeople,
  getFeedback as demoGetFeedback,
  getMyFeedback as demoGetMyFeedback,
  saveFeedback as demoSaveFeedback,
  getBudget as demoGetBudget,
  getRecognitionCounts as demoGetRecognitionCounts,
  getSubmissionStatus as demoGetSubmissionStatus,
  getBehaviorStats as demoGetBehaviorStats
} from '../demo/api'

const API_URL = import.meta.env.VITE_API_URL

if (!DEMO_MODE && !API_URL) {
  throw new Error(
    'VITE_API_URL is not set. The app cannot run without an API.\n' +
      'For local development, create frontend/.env.local containing:\n' +
      '  VITE_API_URL=http://localhost:4000\n' +
      'then restart the dev server — Vite only reads env files at startup.\n' +
      'To run without a backend instead, set VITE_DEMO_MODE=true.'
  )
}

/** True when the app is running on fixtures. Read by the demo banner. */
export const isDemoMode = DEMO_MODE

const KEY_TOKEN = 'bfi_token'
const KEY_USER = 'bfi_user'

/**
 * The session lives in `sessionStorage`, not `localStorage`.
 *
 * `localStorage` persists across tabs, windows and browser restarts until
 * something clears it. On a shared or unattended laptop that means the next
 * person to open the app is signed in as you — which is how a stale cached user
 * kept the app "logged in as Patrick" long after that session should have ended.
 *
 * `sessionStorage` is scoped to the tab. Close it, or open the app in a new tab,
 * and you sign in again. A refresh in the same tab keeps you where you were,
 * which is the point: losing a half-written nomination to a stray F5 is its own
 * kind of harm.
 *
 * If every page load should require signing in, change this one line to an
 * in-memory object. Note what that does not buy you, though: the dev token is
 * the user's email in a wrapper, so anyone can mint one by hand. Where the token
 * is kept is hygiene. Making it unforgeable — signed, with an expiry the server
 * checks — is the actual protection, and it is not built yet.
 */
const store = sessionStorage

// ================================================================
// fetch helper
// ================================================================
async function req(path, { method = 'GET', body } = {}) {
  const token = store.getItem(KEY_TOKEN)

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    })
  } catch {
    // fetch only rejects when the request never completed — server down, DNS,
    // offline. Worth its own message, because "Request failed" sends people
    // looking for a bug that isn't in the code.
    const err = new Error("Can't reach the server. Is the API running?")
    err.status = 0
    err.code = 'NETWORK'
    throw err
  }

  if (!res.ok) {
    let errBody = {}
    try { errBody = await res.json() } catch {}
    const err = new Error(errBody.error || `Request failed (${res.status})`)
    err.status = res.status
    err.code = errBody.code
    throw err
  }

  // Some responses (e.g. signout) are empty.
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const writeJSON = (key, value) => {
  try {
    store.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    // Storage full or private-mode blocked.
    console.warn(`[api] session storage write failed for ${key}`, e)
    return false
  }
}

// ================================================================
// PUBLIC API
// ================================================================

/**
 * Sign in with { email, password }. Returns the authenticated user.
 *
 * The returned user carries `mustChangePassword`. When it is true, the only
 * thing the account can do is change its password — the server refuses
 * everything else, so routing straight to that screen is not a courtesy.
 */
export async function signIn(form) {
  if (DEMO_MODE) return demoSignIn(form)

  const { token, user } = await req('/auth/signin', { method: 'POST', body: form })
  if (token) store.setItem(KEY_TOKEN, token)
  writeJSON(KEY_USER, user)
  return user
}

/** Sign the current user out. */
export async function signOut() {
  if (DEMO_MODE) return demoSignOut()

  try { await req('/auth/signout', { method: 'POST' }) } catch {}
  store.removeItem(KEY_TOKEN)
  store.removeItem(KEY_USER)
}

/**
 * The currently-authenticated user, or null.
 *
 * A cached copy is kept in session storage so the shell can render immediately,
 * but it is never trusted on its own: without a token this returns null, and a
 * 401 clears the cache. The server decides who you are.
 */
export async function getMe() {
  if (DEMO_MODE) return demoGetMe()

  if (!store.getItem(KEY_TOKEN)) return null
  try {
    const { user } = await req('/me')
    writeJSON(KEY_USER, user)
    return user
  } catch (e) {
    if (e.status === 401) {
      store.removeItem(KEY_TOKEN)
      store.removeItem(KEY_USER)
      return null
    }
    throw e
  }
}

/**
 * Replace the current password.
 *
 * The current one is required even though the caller is already signed in: a
 * borrowed session should not be enough to lock the real owner out of their own
 * account.
 *
 * The token stays valid afterwards — it is bound to the account, not to the
 * credential — so nobody gets signed out for doing the right thing.
 */
export async function changePassword({ currentPassword, newPassword }) {
  if (DEMO_MODE) return demoChangePassword({ currentPassword, newPassword })

  await req('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword }
  })

  // The cached user still says mustChangePassword. Re-read it from the server
  // rather than patching the cache, so the flag comes from the same place that
  // enforces it.
  return getMe()
}

/** Colleagues the current user may nominate. Excludes senior management. */
export async function getPeople() {
  if (DEMO_MODE) return demoGetPeople()

  const { people } = await req('/people')
  return people
}

/** Every nomination, for the Recognition Wall. Senior management only. */
export async function getFeedback(filters = {}) {
  if (DEMO_MODE) return demoGetFeedback(filters)

  const qs = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v) })
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const { feedback } = await req(`/feedback${suffix}`)
  return feedback
}

/** What the current user has written. */
export async function getMyFeedback() {
  if (DEMO_MODE) return demoGetMyFeedback()

  const { feedback } = await req('/feedback/mine')
  return feedback
}

/**
 * Recognise one colleague for one or more behaviours.
 *
 * Each entry becomes its own nomination, so recognising someone for three
 * behaviours spends three of the five available that month. All-or-nothing: if
 * one entry fails a check, none are saved and the error says which.
 *
 * The sender is taken from the token server-side, never sent from here.
 */
export async function saveFeedback({ recipient, entries }) {
  if (DEMO_MODE) return demoSaveFeedback({ recipient, entries })

  const { feedback } = await req('/feedback', {
    method: 'POST',
    body: { recipient, entries }
  })
  return feedback
}

/** How many nominations the current user has left this month. */
export async function getBudget() {
  if (DEMO_MODE) return demoGetBudget()

  return req('/me/budget')
}

/**
 * How many times the current user has recognised each colleague this month.
 *
 * Returns `{ maxPerNominee, perNominee: { [colleagueId]: count } }`. There is no
 * monthly total to report — you may recognise as many different colleagues as
 * you like — so this exists purely so the recognise screen can stop someone
 * before they write a story for a colleague they have already named twice.
 *
 * The server enforces the cap regardless. This only decides what the form lets
 * you start.
 */
export async function getRecognitionCounts() {
  if (DEMO_MODE) return demoGetRecognitionCounts()

  const { maxPerNominee, perNominee } = await req('/me/budget')
  return { maxPerNominee, perNominee: perNominee || {} }
}

/**
 * Who has given recognition, and who has not. Super admin only.
 *
 * `period` is a "YYYY-MM" key or the string 'all'; omit it for the current
 * month. Returns names and participation counts — never a story or a nominee,
 * which is what lets a role that cannot read comments call it at all.
 */
export async function getSubmissionStatus(period) {
  if (DEMO_MODE) return demoGetSubmissionStatus(period)

  const suffix = period ? `?period=${encodeURIComponent(period)}` : ''
  return req(`/admin/submission-status${suffix}`)
}

/**
 * Anonymous per-behaviour tally across the whole organisation.
 * No names or story text — safe for any authenticated user. Powers the bubble
 * chart on the Home screen once a staff member has given their first piece of
 * recognition, and on the Recognition Wall.
 *
 * Response shape: { counts: { [behaviorId]: number } }
 */
export async function getBehaviorStats() {
  if (DEMO_MODE) return demoGetBehaviorStats()

  const { counts } = await req('/behaviors/stats')
  return counts || {}
}
