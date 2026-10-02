/**
 * Small formatting helpers used across the recognition UI.
 */

/**
 * Extract initials from a name (first + last, uppercase).
 */
export const initials = (name) => {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("")
}
