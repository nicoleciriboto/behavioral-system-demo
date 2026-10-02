/**
 * The monthly period, in UTC.
 *
 * A port of the backend's `lib/period.ts`, and UTC for the same reason it is:
 * Zimbabwe is UTC+2 year-round, so deriving the key locally while the server
 * derives it in UTC would file a nomination made just after local midnight on
 * the 1st into the previous month — and the per-nominee cap is scoped by exactly
 * that key.
 */

/** "2026-10". */
export function periodKeyFor(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/** Start (inclusive) and end (exclusive) of a period key, in UTC. */
export function periodBounds(periodKey) {
  const [yearRaw, monthRaw] = periodKey.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid period key: ${periodKey}`)
  }

  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1))
  }
}

export function currentPeriod() {
  const key = periodKeyFor()
  return { key, ...periodBounds(key) }
}

/**
 * A timestamp `monthsAgo` months back, on `day` of that month.
 *
 * The seed is written in relative months rather than fixed dates so the demo
 * does not quietly rot — a hardcoded 2026-08 would read as "three years ago"
 * eventually, and the submission tracker's period dropdown would fill up with
 * dead months.
 *
 * The day is clamped twice: to the length of the target month, and — for the
 * current month only — to today. Seeded recognition dated next week would show
 * up on the Wall as having happened in the future.
 */
export function monthsAgoAt(monthsAgo, day, hour = 9) {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() - monthsAgo

  // Day 0 of the following month is the last day of this one.
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  let safeDay = Math.min(day, daysInMonth)
  if (monthsAgo === 0) safeDay = Math.min(safeDay, now.getUTCDate())

  return Date.UTC(year, month, safeDay, hour)
}
