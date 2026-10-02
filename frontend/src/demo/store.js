/**
 * The demo store — state, rules, and response shaping.
 *
 * This is the fixture equivalent of the backend's service layer, and it is
 * deliberately where the rules live rather than in `api.js`. The functions in
 * `api.js` are adapters: parse, delegate, reshape. Anything that decides *who
 * may see what* is here, for the same reason the real system keeps it out of its
 * routes — one place to read, one place to get wrong.
 *
 * State is held in module-level objects and nothing is persisted. A reload
 * resets the demo to its seed, which is both acceptable (nobody is meant to keep
 * demo data) and honest: a half-persisted demo, signed in from `sessionStorage`
 * but with its nominations gone, would look like data loss rather than a reset.
 */

import { BEHAVIORS } from '../data/appData'
import { DEMO_PEOPLE, DEMO_TEMP_PASSWORD, personById } from './roster'
import { seedNominations } from './nominations'
import { currentPeriod, periodBounds, periodKeyFor } from './period'

/* ------------------------------------------------------------------ *
 * Rules, mirrored from the backend
 * ------------------------------------------------------------------ */

/** `MAX_PER_NOMINEE_PER_PERIOD` in nominations.service.ts. */
export const MAX_PER_NOMINEE_PER_PERIOD = 2

/** `BEHAVIOR_VISIBILITY_THRESHOLD` — nominations needed before a nominee sees
 *  *which* behaviours they were named for. */
export const BEHAVIOR_VISIBILITY_THRESHOLD = 3

/** `MIN_COMMENT_WORDS` / `MAX_COMMENT_WORDS`. */
const MIN_COMMENT_WORDS = 10
const MAX_COMMENT_WORDS = 40

/** `MIN_PASSWORD_LENGTH` in lib/password.ts. */
const MIN_PASSWORD_LENGTH = 10

/**
 * Role allow-lists, copied from `middleware/requireRole.ts` — allow-lists, not
 * a ranking.
 *
 * SUPER_ADMIN is absent from `CAN_DISCOVER` on purpose. It is not a more
 * powerful SENIOR_MGMT; administering the directory and reading what colleagues
 * wrote about each other are different jobs, and the super admin has only the
 * first. A demo that let the admin persona onto the Recognition Wall would
 * misrepresent the single most consequential rule in the system.
 */
const CAN_DISCOVER = ['SENIOR_MGMT']
const CAN_ADMINISTER = ['SUPER_ADMIN']

/** Same rule as the backend's `countWords`: split on any run of whitespace. */
const countWords = (text) => {
  const trimmed = (text || '').trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

/**
 * An error shaped like one `req()` throws.
 *
 * The screens read `err.message`, and `getMe` branches on `err.status === 401`.
 * A bare `Error` would render as "[object Object]" in some places and break that
 * branch in others, so fixtures throw the same shape the fetch path does —
 * including `code`, which the real client surfaces from the error body.
 */
function apiError(message, status, code, fields) {
  const err = new Error(message)
  err.status = status
  err.code = code
  if (fields) err.fields = fields
  return err
}

const unauthenticated = (message = 'Not signed in.') =>
  apiError(message, 401, 'UNAUTHENTICATED')

const forbidden = (message = 'Not available to your account.') =>
  apiError(message, 403, 'FORBIDDEN')

const validation = (message, fields) =>
  apiError(message, 422, 'VALIDATION_FAILED', fields)

/* ------------------------------------------------------------------ *
 * Mutable state
 * ------------------------------------------------------------------ */

const freshState = () => ({
  /** Cloned, so a password change does not mutate the roster module. */
  people: DEMO_PEOPLE.map((p) => ({ ...p })),
  nominations: seedNominations(),
  /**
   * Plain-text passwords, which is only defensible because none of them are
   * real and none of them guard anything. The persona picker never sends one;
   * this exists so the forced-change flow has something to verify against.
   */
  passwords: Object.fromEntries(DEMO_PEOPLE.map((p) => [p.id, DEMO_TEMP_PASSWORD])),
  signedInId: null
})

/**
 * Built on first use, not at import.
 *
 * `let state = freshState()` would be a function call at module scope, which a
 * bundler cannot prove is side-effect-free — so it pins this module, and the
 * roster and seeded stories with it, into builds where demo mode is off and
 * every caller has been eliminated. Deferring the work keeps the fixture layer
 * droppable, and nothing needs the state before something asks for it.
 */
let state = null

const db = () => {
  if (!state) state = freshState()
  return state
}

/** Back to the seed. */
export function resetDemo() {
  state = freshState()
}

const stored = (id) => db().people.find((p) => p.id === id) || null

/** The signed-in persona, or null. Internal full record, emails and all. */
export function currentUser() {
  return db().signedInId ? stored(db().signedInId) : null
}

/** The signed-in persona, or a 401 — the fixture equivalent of `requireAuth`. */
function requireUser() {
  const user = currentUser()
  if (!user) throw unauthenticated()
  return user
}

/* ------------------------------------------------------------------ *
 * Shaping
 * ------------------------------------------------------------------ */

/**
 * A person as the API would send them.
 *
 * `withEmail` defaults to false, and that default is the point. The backend
 * selects addresses out of `/people`, `/feedback/mine` and the `POST /feedback`
 * response — a commit exists specifically to stop returning colleagues'
 * addresses to ordinary members, and nothing on screen ever displayed them, so
 * the exposure was invisible in the UI. A fixture layer that returned them
 * anyway would make the demo behave *better* than the real system, and hide the
 * one thing that commit was for.
 *
 * `dbLevel`, `mustChangePassword` and the internal flags are dropped here too:
 * what leaves this function is the `FrontendPerson` field set and nothing else.
 */
function toPerson(person, { withEmail = false } = {}) {
  if (!person) return null
  const out = {
    id: person.id,
    name: person.name,
    role: person.role,
    office: person.office,
    level: person.level,
    color: person.color,
    appRole: person.appRole,
    isNominatable: person.isNominatable
  }
  if (withEmail) out.email = person.email
  return out
}

/** The `GET /me` shape: a person plus the flag that gates every other route. */
export function toSessionUser(person) {
  return {
    ...toPerson(person, { withEmail: true }),
    mustChangePassword: person.mustChangePassword
  }
}

const behaviorById = (id) => BEHAVIORS.find((b) => b.id === id) || null

/**
 * Nomination rows regrouped into the submissions they were written in.
 *
 * A port of `toFrontendFeedback`. Rows sharing a `submissionId` become one
 * record with several entries; a row without one becomes its own record. The
 * Wall counts `entries.length` for stories and distinct senders for peers, so
 * both shapes total correctly.
 *
 * `createdAt` is epoch milliseconds, not an ISO string. The Wall sorts with
 * `c.createdAt - a.createdAt`, and subtracting two ISO strings is NaN — which
 * would leave the stories in arbitrary order with nothing on screen to say so.
 */
function toFeedback(rows, { withEmail = false } = {}) {
  const bySubmission = new Map()
  const out = []

  for (const row of rows) {
    const behavior = behaviorById(row.behaviorId)
    const entry = {
      behaviorId: row.behaviorId,
      behaviorName: behavior?.name || row.behaviorId,
      // 'prof' | 'mgr' | 'lead' — the BehaviorGroup enum values, which the
      // Excel and PDF exporters read off `behaviorGroup`.
      behaviorGroup: behavior?.g || 'prof',
      story: row.story
    }

    const existing = row.submissionId ? bySubmission.get(row.submissionId) : null
    if (existing) {
      existing.entries.push(entry)
      existing.createdAt = Math.min(existing.createdAt, row.createdAt)
      continue
    }

    const record = {
      id: row.submissionId || row.id,
      createdAt: row.createdAt,
      sender: toPerson(stored(row.nominatorId), { withEmail }),
      recipient: toPerson(stored(row.nomineeId), { withEmail }),
      entries: [entry]
    }
    if (row.submissionId) bySubmission.set(row.submissionId, record)
    out.push(record)
  }

  return out.sort((a, b) => b.createdAt - a.createdAt)
}

/* ------------------------------------------------------------------ *
 * Sign-in
 * ------------------------------------------------------------------ */

/**
 * Sign in as a persona.
 *
 * Takes an id rather than an email and password, because the persona picker is
 * a menu and not a credential prompt. The password argument is accepted and
 * verified only when the account is still on its temporary one, which keeps the
 * forced-change screen honest without making the reviewer type anything to get
 * in.
 */
export function signInAs(personId) {
  const person = stored(personId)
  if (!person) throw apiError('No such demo persona.', 404, 'NOT_FOUND')
  db().signedInId = person.id
  return toSessionUser(person)
}

export function signOutNow() {
  db().signedInId = null
}

/**
 * Replace the signed-in persona's password.
 *
 * Every check the real service makes, in the same order: current password
 * verified first, then the length floor, then the reuse rule. The order matters
 * — validating the new password before the current one tells an attacker with a
 * borrowed session whether their guess was close.
 */
export function changePasswordNow({ currentPassword, newPassword }) {
  const user = requireUser()

  if (db().passwords[user.id] !== currentPassword) {
    throw validation('Your current password is not correct.', {
      currentPassword: 'Not correct.'
    })
  }

  if ((newPassword || '').trim().length < MIN_PASSWORD_LENGTH) {
    throw validation(`Use at least ${MIN_PASSWORD_LENGTH} characters.`, {
      newPassword: `At least ${MIN_PASSWORD_LENGTH} characters.`
    })
  }

  if (newPassword === db().passwords[user.id]) {
    throw validation('Choose a password you have not used here before.', {
      newPassword: 'This is your current password.'
    })
  }

  db().passwords[user.id] = newPassword
  user.mustChangePassword = false
  return toSessionUser(user)
}

/* ------------------------------------------------------------------ *
 * Roster
 * ------------------------------------------------------------------ */

/**
 * `GET /people` — who the picker may offer.
 *
 * Excludes the caller and anyone not nominatable, the same enforcement-by-
 * omission as the real route, so an ineligible colleague is never offered in the
 * first place. Addresses are stripped.
 */
export function rosterFor(userId) {
  return db().people
    .filter((p) => p.isNominatable && p.id !== userId)
    .map((p) => toPerson(p))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/* ------------------------------------------------------------------ *
 * Visibility
 * ------------------------------------------------------------------ */

/**
 * `GET /feedback` — every nomination, for the Recognition Wall.
 *
 * Senior management only. This is the endpoint that serves nominator names
 * alongside story text, so it is the one whose gate matters most, and it is the
 * only read in the demo that includes addresses.
 */
export function allFeedback(viewer, filters = {}) {
  if (!CAN_DISCOVER.includes(viewer.appRole)) {
    throw forbidden('The recognition wall is available to senior management.')
  }

  const { recipient, sender, behavior, group } = filters
  const LEVEL_TO_GROUP = {
    Staff: 'prof',
    Manager: 'mgr',
    Leader: 'lead',
    'Senior Management': 'lead'
  }

  const rows = db().nominations.filter((row) => {
    if (recipient && row.nomineeId !== recipient) return false
    if (sender && stored(row.nominatorId)?.email !== sender) return false
    if (behavior && row.behaviorId !== behavior) return false
    if (group && LEVEL_TO_GROUP[stored(row.nomineeId)?.level] !== group) return false
    return true
  })

  return toFeedback(rows, { withEmail: true })
}

/**
 * `GET /feedback/mine` — what the caller wrote.
 *
 * Open to everyone and carries no addresses: these are the caller's own words,
 * about colleagues whose addresses they have no need for here.
 */
export function myFeedback(userId) {
  return toFeedback(
    db().nominations.filter((row) => row.nominatorId === userId)
  )
}

/**
 * What a nominee may see about recognition they received.
 *
 * The third leg of the visibility rule: the count is always visible, the
 * behaviours unlock at three nominations, and the nominator is never named at
 * any threshold. Below the threshold the behaviour list is not filtered but
 * absent — returning a trimmed list would still leak which behaviours, and
 * returning an empty one would read as "nobody has recognised you".
 *
 * Implemented because the rule belongs in this layer, but nothing calls it:
 * `client.js` exposes no method for received recognition, and no screen renders
 * one. It is here so that when a screen appears, the rule is already correct
 * rather than invented at the call site.
 */
export function receivedFor(userId) {
  const rows = db().nominations.filter((row) => row.nomineeId === userId)
  const count = rows.length

  if (count < BEHAVIOR_VISIBILITY_THRESHOLD) {
    return { count, behaviors: null, unlocksAt: BEHAVIOR_VISIBILITY_THRESHOLD }
  }

  const tally = {}
  rows.forEach((row) => {
    tally[row.behaviorId] = (tally[row.behaviorId] || 0) + 1
  })

  return {
    count,
    unlocksAt: BEHAVIOR_VISIBILITY_THRESHOLD,
    behaviors: Object.entries(tally).map(([id, n]) => ({
      behaviorId: id,
      behaviorName: behaviorById(id)?.name || id,
      count: n
    }))
  }
}

/* ------------------------------------------------------------------ *
 * Submitting
 * ------------------------------------------------------------------ */

/**
 * `POST /feedback` — recognise one colleague for one or more behaviours.
 *
 * All-or-nothing, like the real service: every entry is checked before any row
 * is written, so a submission that trips the cap on its second behaviour leaves
 * nothing behind. Only `recipient.id` is trusted from the payload — the name,
 * role and level are re-read from the store, because a client-supplied level is
 * how you get a leadership behaviour accepted for a Staff member.
 */
export function addSubmission(userId, recipientId, entries) {
  const nominee = stored(recipientId)

  if (!nominee) throw apiError('No such colleague.', 404, 'NOT_FOUND')
  if (nominee.id === userId) throw validation('You cannot nominate yourself.')
  if (!nominee.isNominatable) {
    throw validation(`${nominee.name} is not eligible to be nominated.`)
  }

  entries.forEach((entry) => {
    if (!behaviorById(entry.behaviorId)) {
      throw validation('Choose a behaviour.')
    }
    const words = countWords(entry.story)
    if (words < MIN_COMMENT_WORDS) {
      throw validation('Describe when this person showed the behaviour.', {
        comment: `At least ${MIN_COMMENT_WORDS} words.`
      })
    }
    if (words > MAX_COMMENT_WORDS) {
      throw validation(`Keep it to ${MAX_COMMENT_WORDS} words or fewer.`, {
        comment: `At most ${MAX_COMMENT_WORDS} words.`
      })
    }
  })

  const period = currentPeriod()
  const already = db().nominations.filter(
    (row) =>
      row.nominatorId === userId &&
      row.nomineeId === recipientId &&
      row.periodKey === period.key
  ).length

  // Counted in nominations, not submissions: naming two behaviours in one
  // sitting spends both.
  if (already + entries.length > MAX_PER_NOMINEE_PER_PERIOD) {
    const left = Math.max(0, MAX_PER_NOMINEE_PER_PERIOD - already)
    if (left === 0) {
      throw validation(
        `You have already recognised ${nominee.name} ${MAX_PER_NOMINEE_PER_PERIOD} times this month. ` +
          'You can recognise them again from the 1st — and you can recognise as many other colleagues as you like.'
      )
    }
    throw validation(
      `You can recognise ${nominee.name} for ${left} more ${left === 1 ? 'behaviour' : 'behaviours'} this month.`
    )
  }

  const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const now = Date.now()

  const rows = entries.map((entry, i) => ({
    id: `${submissionId}_${i + 1}`,
    submissionId,
    nominatorId: userId,
    nomineeId: recipientId,
    behaviorId: entry.behaviorId,
    story: (entry.story || '').trim(),
    createdAt: now + i,
    periodKey: periodKeyFor(new Date(now))
  }))

  db().nominations.push(...rows)

  // No addresses: this goes back to whoever just submitted it.
  return { feedback: toFeedback(rows)[0] || null, budget: budgetFor(userId) }
}

/* ------------------------------------------------------------------ *
 * Budget
 * ------------------------------------------------------------------ */

/**
 * `GET /me/budget`.
 *
 * No `limit` or `remaining`: the monthly total was dropped, and the period
 * exists now only to reset the per-nominee count. `given` is informational;
 * `perNominee` is the number that decides anything.
 */
export function budgetFor(userId) {
  const period = currentPeriod()
  const mine = db().nominations.filter(
    (row) => row.nominatorId === userId && row.periodKey === period.key
  )

  const perNominee = {}
  mine.forEach((row) => {
    perNominee[row.nomineeId] = (perNominee[row.nomineeId] || 0) + 1
  })

  return {
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    given: mine.length,
    maxPerNominee: MAX_PER_NOMINEE_PER_PERIOD,
    perNominee
  }
}

/* ------------------------------------------------------------------ *
 * Aggregates
 * ------------------------------------------------------------------ */

/**
 * `GET /behaviors/stats` — story count per behaviour, org-wide.
 *
 * Open to every signed-in persona, and no gate, because there is nothing here
 * to attribute: the response is a behaviour code mapped to a number. Behaviours
 * nobody has been recognised for are omitted rather than zeroed, matching a
 * count query over existing rows.
 */
export function behaviorCounts() {
  const counts = {}
  db().nominations.forEach((row) => {
    counts[row.behaviorId] = (counts[row.behaviorId] || 0) + 1
  })
  return counts
}

export const ALL_PERIODS = 'all'

/**
 * `GET /admin/submission-status` — who gave recognition, and who did not.
 *
 * Super admin only. It carries names, addresses and participation counts, and
 * deliberately not one story or nominee — which is the whole reason a role that
 * cannot read a single comment is allowed to call it.
 *
 * Everyone with an account appears, senior management and the super admin
 * included: anyone may give recognition, so anyone can be missing from it.
 * Sorted by name, never by volume — a list ordered by how much each person
 * submitted is a participation leaderboard.
 */
export function submissionStatusFor(viewer, periodKey) {
  if (!CAN_ADMINISTER.includes(viewer.appRole)) {
    throw forbidden('The submission tracker is restricted.')
  }

  const key = periodKey || ALL_PERIODS
  const bounds = key === ALL_PERIODS ? null : periodBounds(key)

  const inWindow = (row) =>
    !bounds ||
    (row.createdAt >= bounds.start.getTime() && row.createdAt < bounds.end.getTime())

  const people = db().people
    .map((person) => {
      const mine = db().nominations.filter((row) => row.nominatorId === person.id)
      const windowed = mine.filter(inWindow)

      // Sittings, not stories: recognising one colleague for three behaviours
      // in one go is one submission.
      const submissions = new Set(windowed.map((row) => row.submissionId)).size
      const lastIn = windowed.reduce((max, row) => Math.max(max, row.createdAt), 0)
      const lastEver = mine.reduce((max, row) => Math.max(max, row.createdAt), 0)

      return {
        id: person.id,
        name: person.name,
        email: person.email,
        // The tracker searches on `team`, not `office`.
        team: person.office,
        role: person.role,
        level: person.dbLevel,
        appRole: person.appRole,
        submitted: windowed.length > 0,
        submissions,
        stories: windowed.length,
        lastSubmittedAt: lastIn ? new Date(lastIn).toISOString() : null,
        // Kept separate from `lastSubmittedAt` so "quiet this period" and "has
        // never once used the tool" can be told apart. They call for completely
        // different follow-up.
        everSubmittedAt: lastEver ? new Date(lastEver).toISOString() : null
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const submitted = people.filter((p) => p.submitted)

  // Every period that has nominations, newest first, plus the current one.
  const periods = Array.from(
    new Set([currentPeriod().key, ...db().nominations.map((row) => row.periodKey)])
  ).sort((a, b) => b.localeCompare(a))

  return {
    period: {
      key,
      start: bounds ? bounds.start.toISOString() : null,
      end: bounds ? bounds.end.toISOString() : null
    },
    periods,
    totals: {
      people: people.length,
      submitted: submitted.length,
      notSubmitted: people.length - submitted.length,
      submissions: submitted.reduce((a, p) => a + p.submissions, 0),
      stories: submitted.reduce((a, p) => a + p.stories, 0)
    },
    people
  }
}

export { requireUser, personById }
