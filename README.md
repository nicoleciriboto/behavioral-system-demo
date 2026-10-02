# Behaviors for Impact

CHAI Zimbabwe's peer-recognition tool. Colleagues sign in, pick someone to
recognize, choose the CHAI behaviors that person demonstrated, and write a short
story per behavior. Senior management searches those stories to find the right
person for a piece of work.

**It is not a performance rating system.** There is no score anywhere, no way to
record the absence of a behavior, and no negative feedback. The point is a
searchable capability directory built out of things colleagues actually observed.

Pilot scope: the Zimbabwe office, 37 people.

## Layout

```
frontend/     React 19 + Vite. See "Frontend" below.
backend/      Express + TypeScript + Prisma + PostgreSQL (Neon).
```

## Quick start

Two terminals. Backend first — the frontend expects it on port 4000.

```bash
cd backend
cp .env.example .env      # then fill in the two Neon connection strings
npm install
npm run migrate           # creates the tables
npm run seed              # 12 behaviors, 37-person roster, sample nominations
npm run dev               # http://localhost:4000
```

```bash
cd frontend
npm install
npm run dev               # http://localhost:3000
```

Node 18+ for the backend (it uses the built-in `fetch`).

### The two Neon connection strings

`DATABASE_URL` is the **pooled** string — its host contains `-pooler`. That is
what the running app uses.

`DIRECT_DATABASE_URL` is the same string with `-pooler` removed. Prisma Migrate
needs it, because a migration runs schema changes inside one continuous session
and the pooler hands connections around between requests. Leaving it as the
placeholder is why a first migration fails with
`Can't reach database server at HOST.REGION.aws.neon.tech`.

## Domain rules

These are the spec, and each lives in exactly one service.

**Nominations are positive-only.** A comment is required and must describe when
the person showed the behavior.

**Visibility is three-way.** This is the core requirement:

|                   | count | behaviors        | nominator + comment |
| ----------------- | ----- | ---------------- | ------------------- |
| The nominee       | yes   | only at 3+ noms  | **no**              |
| Peers             | no    | no               | no                  |
| Senior management | yes   | yes              | yes                 |

Enforced by what the API sends, not by what the UI renders. `GET /me/received`
has no comment or nominator field on either branch — a field the browser
receives and hides is still in the network tab.

**Who can nominate whom.** Anyone nominates anyone, deliberately across teams.
That reach is the point of the tool.

**Five checks on every nomination:**

1. No self-nomination.
2. Nominee must have `isNominatable` — Country Directors are excluded.
3. The behavior must apply at the nominee's level.
4. The nominator must have budget remaining (5 per month).
5. Not already recorded for that nominee and behavior this month.

Each returns its own error `code`, so the form can say which one it was.

**Behavior groups accumulate by level:** Staff → prof; Manager → prof, mgr;
Leader → prof, mgr, lead. One exported const in
`backend/src/modules/behaviors/behaviors.service.ts` — that is what changes when
the pilot expands past Zimbabwe.

**No cycles.** Nominating and searching are open every day. The monthly period
exists only to reset the budget.

**Counts are raw.** Single office, so no pool normalization.

## Two things that look like details and are not

**`level` and `appRole` are separate fields.** `level` (Staff/Manager/Leader)
decides which behaviors may be attributed to you. `appRole`
(MEMBER/SENIOR_MGMT/SUPER_ADMIN) decides what you may read. Deriving one from the
other breaks in both directions: the People & Talent manager needs the Wall and
is a Manager, and a Leader in another country should not read Zimbabwe's
comments.

SUPER_ADMIN and SENIOR_MGMT are **not a ladder**. The super admin manages the
directory and cannot read a single comment; senior management reads nominations
and cannot manage the directory. Someone needing both gets both, explicitly.

**Discover defaults to sorting by name, not count.** A descending list reads as a
performance ranking, and zero nominations means low visibility rather than poor
behavior. `sort=count` exists; it is just not how the page opens.
`distinctNominators` sits next to `count` because four nominations from four
colleagues is stronger evidence than four from one enthusiastic one.

## Frontend

The frontend picks its data source once at boot from `VITE_API_URL`:

| `VITE_API_URL` | Mode   | What happens                                                          |
| -------------- | ------ | --------------------------------------------------------------------- |
| **unset**      | Demo   | Reads/writes `localStorage`, uses the static roster in `appData.js`.  |
| **set**        | Remote | Every method issues `fetch(VITE_API_URL + path)` with a Bearer token. |

```bash
# frontend/.env.local
VITE_API_URL=http://localhost:4000
```

Restart `npm run dev` after editing env files. The client code path is the same
in both modes — see [`frontend/src/api/client.js`](frontend/src/api/client.js).

Every backend call goes through that one file. Method names and payloads match
the API:

| Client method                           | Endpoint             |
| --------------------------------------- | -------------------- |
| `signIn({ name, email })`               | `POST /auth/signin`  |
| `signOut()`                             | `POST /auth/signout` |
| `getMe()`                               | `GET /me`            |
| `getPeople()`                           | `GET /people`        |
| `getFeedback(filters)`                  | `GET /feedback`      |
| `getMyFeedback()`                       | `GET /feedback/mine` |
| `saveFeedback({ recipient, entries })`  | `POST /feedback`     |

All of these are implemented. They live in
`backend/src/modules/compat/` — an adapter that matches the client as it stands
today (enveloped responses, `/people`, several behaviors per submission). It
holds no business rules, and it is one folder to delete once the frontend moves
to the native routes below.

### Screens

- `pages/LoginPage.jsx` — sign-in form
- `pages/Dashboard.jsx` — auth-gated shell with nested routes
- `pages/screens/OnboardingScreen.jsx` — welcome, "Get started" → recognize
- `pages/screens/HomeScreen.jsx` — personal stats + behaviors overview
- `pages/screens/RecognizeScreen.jsx` — pick colleague → pick behaviors (stories inline) → submit
- `pages/screens/RecognitionWallScreen.jsx` — senior management: per-person drilldown
- `components/DashboardNav.jsx` — top nav, role-gated Wall link
- `api/client.js` — the single data-layer seam
- `data/appData.js` — 12 behaviors, 3 groups, 37-person Zimbabwe roster

## Backend

```
backend/src/
  server.ts              express app, mounts routes
  env.ts                 zod-validated process.env
  db.ts                  PrismaClient singleton
  middleware/            auth, requireRole, errorHandler
  modules/
    auth/                POST /auth/signin, /auth/signout
    users/               GET /me, /me/budget, /colleagues
    behaviors/           GET /behaviors, /colleagues/:id/behaviors
    nominations/         POST /nominations, GET /me/received, /me/given
    admin/               GET /admin/discover, /participation, /users, /access-log
    compat/              adapter for the current frontend client
  lib/                   accessLog, errors, period, asyncHandler
prisma/
  schema.prisma
  migrations/
  seed.ts                12 behaviors + Zimbabwe roster
scripts/
  smoke.ts               end-to-end check against a running server
```

Routes parse and validate. Services decide. The Prisma client is a singleton in
`db.ts` — never instantiated per file, because each instance opens its own pool
and Neon caps connections hard.

Every read in `admin.service.ts` writes an access-log row **before returning**,
in the service rather than the route, so there is no path to senior-management
data that skips logging.

### Testing it

```bash
npm run dev      # one terminal
npm run smoke    # another
```

`scripts/smoke.ts` drives the live API over HTTP as five seeded people and
asserts every rule above — 73 checks. It authenticates with an
`x-dev-user-email` header, which the middleware honors only outside production,
so one running server can be exercised as a participant, a senior manager and an
admin without restarts.

It writes real rows, so point it at a development database. Each run adds
`smoke.*` accounts; `npx prisma migrate reset` clears them and reseeds.

## Authentication — read this before deploying

Auth is a **documented stub**. Entra ID / OIDC is the plan; it is not built.

`POST /auth/signin` matches on email and returns a token that is the email in a
wrapper. It is not a credential — anyone can mint one for any address. `name` is
ignored, which closes the original hole where typing a Country Director's name in
the login form granted their access: every attribute that matters now comes from
the database row.

Two guardrails make sure the stub cannot ship by accident:

- `env.ts` refuses to boot if `DEV_USER_EMAIL` is set with `NODE_ENV=production`.
- The `Bearer` and `x-dev-user-email` paths are ignored entirely in production,
  and `/auth/signin` returns 403.

**Which means a deployment with `NODE_ENV=production` has no way to sign in at
all — every request returns 401.** That is deliberate, and it is the thing to
resolve before this is exposed to real users. Options, roughly in order of
honesty:

1. Wire up Entra ID.
2. Put the deployment behind something that authenticates (VPN, Azure App
   Service auth, an access-code gate) and run it with the stub enabled.
3. Keep it internal and treat it as a demo.

Do not put it on a public URL with the stub enabled. The roster is real people's
names, and anyone who finds the URL could sign in as the Country Director and
read every comment.

`entraOid` is on `User` from the first migration precisely so SSO does not have
to be retrofitted onto existing accounts later.

## Seed data

The roster is real: 37 CHAI Zimbabwe colleagues, real names and job titles.

The nominations are not. Every seeded comment is prefixed **`[Sample]`** because
they are invented sentences attributed to named real colleagues — without the
marker, a demo shows what look like genuine quotes about real people. **Do not
run the seed against a production database.** The roster alone is fine anywhere.

The sample set deliberately contains cases the API has to get right:

| Person              | Situation                     | Why it is there                        |
| ------------------- | ----------------------------- | -------------------------------------- |
| Tatenda Chishapira  | 5 nominations from 5 people   | strong evidence                        |
| Juliet Jokwiro      | 4 nominations from 1 person   | same count, far weaker                 |
| Charity Giyava      | exactly 3                     | just unlocked                          |
| Evidence Makadzange | 2                             | still locked                           |
| nine people         | zero                          | low visibility, not poor behavior      |
| Sangiwe Moyo        | Country Director              | `isNominatable: false`                 |
| Thuthuka Moyo       | Manager-level senior mgmt     | why `appRole` is not derived from level |
| Precious Mutema     | Staff + SUPER_ADMIN           | administers, cannot read comments      |

## Design system

CHAI's design system lives in `frontend/_ds/`:

- Brand colors as CSS custom properties (`--chai-dark-blue`, `--chai-turquoise`)
- Trebuchet MS + Fira Sans typography
- Shared button, form, and layout tokens

## Known gaps

- **No nominee-facing screen.** `GET /me/received` works and nothing calls it, so
  a person cannot see their own count. That is the three-way visibility rule with
  no UI.
- **No super admin UI.** `/admin/users`, `/admin/participation` and
  `/admin/access-log` all work and nothing calls them.
- **The Wall gate reads `level === 'Senior Management'`** rather than
  `appRole === 'SENIOR_MGMT'`. Both are served; the second is the one that cannot
  be typed into.
- **`LEVEL_TO_GROUP` in the frontend does not accumulate** — Managers are only
  offered manager behaviors, so nobody can be recognized for integrity at that
  level. The API allows it; the UI does not offer it.
- **Story minimum disagrees.** The form enables submit at 10 characters; the
  server requires 40. A 15-character story submits and is rejected.
- **`team` is a placeholder** — `"CHAI Zimbabwe"` for everyone, because the
  roster records only an office. Discover displays it.
- **Behavior text is hardcoded** in `appData.js` rather than fetched from
  `GET /behaviors`, so the questions can drift from the database.
- **The budget race is not fully closed.** Count and insert share a transaction,
  but two requests in the same instant could both read 4 under Postgres' default
  isolation. Not worth closing for 37 people; the realistic race — a
  double-clicked submit — is caught by the unique constraint.
