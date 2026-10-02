/**
 * Where a signed-in user lands, and who counts as senior management.
 *
 * Both answers live here because the redirect happens in three places — the
 * `/login` route once a session already exists, the dashboard's index route, and
 * its catch-all — and three copies of the same conditional is three chances for
 * one of them to be missed.
 */

/**
 * Senior management, the only role the Recognition Wall opens for.
 *
 * `appRole` is checked first because it is what the server actually gates on
 * (`CAN_DISCOVER` in the backend's requireRole). `level` is the folded string
 * the compat layer builds for the current screens, kept as a fallback so this
 * keeps working until those screens migrate off it. The two agree today —
 * `frontendLevel` maps SENIOR_MGMT to 'Senior Management' — so accepting both
 * widens nothing.
 */
export function isSeniorMgmt(user) {
  return user?.appRole === 'SENIOR_MGMT' || user?.level === 'Senior Management'
}

/**
 * The super admin, the only role the submission tracker opens for.
 *
 * No `level` fallback, unlike `isSeniorMgmt`. The compat layer folds
 * SENIOR_MGMT into the `level` string but has nothing for SUPER_ADMIN, so
 * `appRole` is the only honest source — and inventing a second one would be
 * inventing a way for the two to disagree.
 */
export function isSuperAdmin(user) {
  return user?.appRole === 'SUPER_ADMIN'
}

/**
 * The first screen after signing in.
 *
 * Senior management goes straight to the Wall, the super admin to the
 * submission tracker. The onboarding page explains how to give recognition,
 * which is not what either of them signed in to do — and making them click past
 * an explainer to reach their own job every single time is friction with no
 * purpose.
 *
 * It stays reachable at /overview for anyone who wants it; this only decides
 * where you arrive.
 */
export function landingPath(user) {
  if (isSuperAdmin(user)) return '/submissions'
  return isSeniorMgmt(user) ? '/wall' : '/overview'
}
