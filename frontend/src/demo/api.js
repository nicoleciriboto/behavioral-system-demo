/**
 * Fixture implementations — one per method exported from `api/client.js`.
 *
 * Thin adapters, deliberately. Each one resolves the caller, delegates to
 * `store.js`, and returns the same shape the matching route returns. No rule
 * lives here; if a function in this file decides who may see something, it is in
 * the wrong file.
 *
 * Every one is `async` even where nothing awaits, because the real client's are
 * and the screens `await` them. A fixture that returned a bare value would still
 * work through `await`, but a synchronous throw would escape a `.catch()` chain
 * that the fetch path routes into — so the signatures match exactly.
 */

import * as store from './store'
import { DEMO_LOGINS, DEMO_TEMP_PASSWORD, personByLogin } from './roster'

/**
 * A short pause in front of every call.
 *
 * Not for realism as such — it is so the loading states the screens already
 * render actually appear. With instant fixtures the spinners and "Loading your
 * recognition…" lines never paint, and a reviewer would be assessing a version
 * of the UI nobody will ever see. Short enough not to feel sluggish.
 */
const LATENCY_MS = 90
const tick = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

/**
 * Sign in by address.
 *
 * Takes `{ email }` from the sign-in form, or `{ personaId }` from the banner's
 * role switcher, which names a persona directly and so needs no lookup.
 *
 * No password is checked, and no password is asked for. A demo build with no
 * backend has nothing to verify a credential against, so a password box would
 * be theatre — and theatre that invites a reviewer to type a real password into
 * a page that cannot protect it.
 */
export async function signIn(form = {}) {
  await tick()

  const person = form.personaId
    ? store.personById(form.personaId)
    : personByLogin(form.email)

  if (!person) {
    // Names the accepted addresses, unlike the real route, which returns the
    // same message for an unknown address as for a wrong password so that it
    // cannot be used to enumerate accounts. There is nothing to enumerate here
    // and nobody to help by being vague.
    const accepted = DEMO_LOGINS.map((l) => l.email).join(', ')
    const err = new Error(`No demo account for that address. Try ${accepted}.`)
    err.status = 401
    err.code = 'UNAUTHENTICATED'
    throw err
  }

  return store.signInAs(person.id)
}

export async function signOut() {
  await tick()
  store.signOutNow()
}

export async function getMe() {
  await tick()
  const user = store.currentUser()
  return user ? store.toSessionUser(user) : null
}

/**
 * Replace the current password, then re-read the user.
 *
 * Returns the refreshed user rather than patching a cached copy, so
 * `mustChangePassword` comes from the same place that enforces it — which is
 * what `ChangePasswordPage` depends on to let someone through.
 */
export async function changePassword({ currentPassword, newPassword }) {
  await tick()
  return store.changePasswordNow({ currentPassword, newPassword })
}

/* ------------------------------------------------------------------ *
 * Roster and recognition
 * ------------------------------------------------------------------ */

export async function getPeople() {
  await tick()
  return store.rosterFor(store.requireUser().id)
}

export async function getFeedback(filters = {}) {
  await tick()
  return store.allFeedback(store.requireUser(), filters)
}

export async function getMyFeedback() {
  await tick()
  return store.myFeedback(store.requireUser().id)
}

/**
 * Recognise one colleague for one or more behaviours.
 *
 * Returns the submission, as `POST /feedback` does. The state it writes is in
 * memory, so the Wall, the Home counters, the bubble chart and the tracker all
 * reflect it immediately — and all forget it on reload.
 */
export async function saveFeedback({ recipient, entries }) {
  await tick()
  const { feedback } = store.addSubmission(
    store.requireUser().id,
    recipient?.id,
    entries || []
  )
  return feedback
}

export async function getBudget() {
  await tick()
  return store.budgetFor(store.requireUser().id)
}

export async function getRecognitionCounts() {
  await tick()
  const { maxPerNominee, perNominee } = store.budgetFor(store.requireUser().id)
  return { maxPerNominee, perNominee: perNominee || {} }
}

/* ------------------------------------------------------------------ *
 * Aggregates
 * ------------------------------------------------------------------ */

export async function getSubmissionStatus(period) {
  await tick()
  return store.submissionStatusFor(store.requireUser(), period)
}

export async function getBehaviorStats() {
  await tick()
  // Gate-free on purpose: the response is behaviour codes mapped to numbers,
  // with no name and no story text in it. `requireUser` is still called, because
  // the real route sits behind `requireAuth`.
  store.requireUser()
  return store.behaviorCounts()
}

/* ------------------------------------------------------------------ *
 * Demo-only surface — not part of the client contract
 * ------------------------------------------------------------------ */

export { DEMO_LOGINS, DEMO_TEMP_PASSWORD }
export const resetDemo = () => store.resetDemo()
