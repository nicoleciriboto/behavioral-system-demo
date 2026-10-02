/**
 * The demo roster — sixteen invented colleagues.
 *
 * None of these are real people. The names were chosen to look plausible for a
 * CHAI Zimbabwe office without matching anyone on the actual pilot roster, which
 * is in the User table and in this repository's history. A reviewer clicking
 * through fixtures should not be reading a real colleague's name next to an
 * invented story about them.
 *
 * Addresses are all `@example.invalid`. RFC 2606 reserves that TLD so nothing
 * there can resolve or receive mail — which matters because the submission
 * tracker has a "copy email addresses" button, and those strings land on a
 * reviewer's clipboard where they may well get pasted somewhere.
 */

/* ------------------------------------------------------------------ *
 * Shape translation — kept identical to backend compat.service.ts
 * ------------------------------------------------------------------ */

/**
 * The frontend's folded `level` string.
 *
 * A copy of `frontendLevel` from the backend's compat service. The screens gate
 * on this string (`LEVEL_TO_GROUP[recipient.level]`, `level !== 'Senior
 * Management'`), so a fixture that wrote `level` by hand could produce a
 * combination the real API cannot emit — a SENIOR_MGMT user whose level reads
 * 'Manager', say — and the demo would exercise a code path that does not exist.
 *
 * So personas below declare `dbLevel` and `appRole` separately, exactly as the
 * database keeps them, and `level` is always derived.
 */
function frontendLevel(dbLevel, appRole) {
  if (appRole === 'SENIOR_MGMT') return 'Senior Management'
  if (dbLevel === 'MANAGER') return 'Manager'
  if (dbLevel === 'LEADER') return 'Leader'
  return 'Staff'
}

/** CHAI palette, hashed off the name. Also lifted from the compat service, so a
 *  person's avatar colour is the one the real API would have sent. */
const PALETTE = ['#003E78', '#117996', '#1ED47F', '#7C1220', '#F4B71B']

function colorFor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

/* ------------------------------------------------------------------ *
 * Personas
 * ------------------------------------------------------------------ */

/**
 * Columns, in order: id, name, role, team, dbLevel, appRole, isNominatable.
 *
 * A tuple table rather than sixteen object literals, because the point of this
 * list is the *spread* across levels and roles, and that is only legible when
 * the columns line up.
 *
 * The spread is deliberate:
 *
 *   - thirteen MEMBERs across Staff, Manager and Leader, so all three behaviour
 *     groups are reachable from the recognise screen;
 *   - two SENIOR_MGMT, who land on the Recognition Wall;
 *   - one SUPER_ADMIN, who lands on the submission tracker and — correctly — is
 *     refused the Wall;
 *   - one MEMBER with `isNominatable: false`, so the picker visibly omits
 *     somebody the tracker still lists.
 *
 * Senior management is not nominatable, matching the pilot rule that excludes
 * Country Directors from being recognised.
 */
const PERSONAS = [
  ['u01', 'Tendai Mhlanga',      'Program Analyst',         'Zimbabwe · HIV/TB',           'STAFF',   'MEMBER',      true],
  ['u02', 'Rudo Chikafu',        'Technical Advisor',       'Zimbabwe · Malaria',          'STAFF',   'MEMBER',      true],
  ['u03', 'Farai Nyandoro',      'Program Manager',         'Zimbabwe · HIV/TB',           'MANAGER', 'MEMBER',      true],
  ['u04', 'Chipo Zvobgo',        'Finance Officer',         'Zimbabwe · Operations',       'STAFF',   'MEMBER',      true],
  ['u05', 'Takudzwa Mberi',      'Senior Program Manager',  'Zimbabwe · Health Financing', 'MANAGER', 'MEMBER',      true],
  ['u06', 'Nomsa Dube',          'Program Associate',       'Zimbabwe · Malaria',          'STAFF',   'MEMBER',      true],
  ['u07', 'Simbarashe Gwenzi',   'Program Director',        'Zimbabwe · HIV/TB',           'LEADER',  'MEMBER',      true],
  ['u08', 'Tsitsi Mangwiro',     'M&E Specialist',          'Zimbabwe · Health Financing', 'STAFF',   'MEMBER',      true],
  ['u09', 'Blessing Rusike',     'Procurement Lead',        'Zimbabwe · Operations',       'MANAGER', 'MEMBER',      true],
  ['u10', 'Kudakwashe Moyo',     'Data Analyst',            'Zimbabwe · Malaria',          'STAFF',   'MEMBER',      true],
  ['u11', 'Memory Sibanda',      'HR Business Partner',     'Zimbabwe · Operations',       'MANAGER', 'MEMBER',      false],
  ['u12', 'Panashe Mutasa',      'Program Associate',       'Zimbabwe · HIV/TB',           'STAFF',   'MEMBER',      true],
  ['u13', 'Ngonidzashe Chirwa',  'Deputy Director',         'Zimbabwe · Health Financing', 'LEADER',  'MEMBER',      true],
  ['u14', 'Shamiso Nyoni',       'Country Director',        'Zimbabwe · Country Office',   'LEADER',  'SENIOR_MGMT', false],
  ['u15', 'Tapiwa Mukora',       'Deputy Country Director', 'Zimbabwe · Country Office',   'LEADER',  'SENIOR_MGMT', false],
  ['u16', 'Anesu Katsande',      'Systems Administrator',   'Zimbabwe · Operations',       'MANAGER', 'SUPER_ADMIN', true]
]

const emailFor = (name) =>
  name.toLowerCase().split(/\s+/).join('.') + '@example.invalid'

/**
 * The account still on its temporary password.
 *
 * One persona carries `mustChangePassword`, so the forced-change screen is
 * reachable instead of being a branch nothing in the demo can reach. The
 * reviewer never types this: the persona picker hands it to `signIn` the same
 * way the real sign-in form does, so the change-password screen can skip asking
 * for a password that was supplied moments ago.
 */
export const DEMO_TEMP_PASSWORD = 'demo-temporary-password'

/**
 * Every persona, in roster order. The full `{ ...person, email }` record.
 *
 * Annotated pure so the bundler may drop it. Building this list is a call at
 * module scope, and without the annotation that counts as a side effect — which
 * kept sixteen invented names and their addresses in production builds where
 * demo mode is off and nothing reads them.
 */
export const DEMO_PEOPLE = /*#__PURE__*/ PERSONAS.map(
  ([id, name, role, team, dbLevel, appRole, isNominatable]) => ({
    id,
    name,
    email: emailFor(name),
    role,
    /** The screens render "{role} · {office}". Sourced from `team`, as in the API. */
    office: team,
    dbLevel,
    appRole,
    isNominatable,
    level: frontendLevel(dbLevel, appRole),
    color: colorFor(name),
    mustChangePassword: id === 'u12'
  })
)

export const personById = (id) => DEMO_PEOPLE.find((p) => p.id === id) || null

/* ------------------------------------------------------------------ *
 * Sign-in accounts
 * ------------------------------------------------------------------ */

/**
 * The three addresses the demo signs in with — one per role, because the three
 * roles are the three dashboards and that is the whole reason to offer a choice.
 *
 * These are sign-in *aliases*, not the personas' addresses. The roster keeps
 * `@example.invalid` for that, and deliberately: the submission tracker displays
 * every address and has a button that copies them all to the clipboard. Writing
 * `@gmail.com` into the fixture data would put addresses that plausibly belong
 * to real people onto a reviewer's clipboard, next to invented statements about
 * invented conduct. The alias gets someone in; the data stays undeliverable.
 *
 * The member is Tendai rather than an arbitrary pick: Tendai has already given
 * recognition in the seed, so the Home screen has history and a chart to show
 * instead of an empty state.
 */
export const DEMO_LOGINS = [
  {
    email: 'user@gmail.com',
    personaId: 'u01',
    label: 'Member',
    blurb: 'Gives recognition and sees their own history and the anonymous behaviour bubble chart.'
  },
  {
    email: 'senior@gmail.com',
    personaId: 'u14',
    label: 'Senior management',
    blurb: 'Lands on the Recognition Wall.'
  },
  {
    email: 'admin@gmail.com',
    personaId: 'u16',
    label: 'Super admin',
    blurb: 'Lands on the submission tracker.'
  }
]

/** Resolve a typed address to a persona. Aliases first, then the roster's own. */
export function personByLogin(email) {
  const key = (email || '').trim().toLowerCase()
  if (!key) return null

  const alias = DEMO_LOGINS.find((l) => l.email === key)
  if (alias) return personById(alias.personaId)

  // The persona addresses still work, so any of the sixteen is reachable to
  // anyone who knows one — including the account still on a temporary password.
  return DEMO_PEOPLE.find((p) => p.email.toLowerCase() === key) || null
}
