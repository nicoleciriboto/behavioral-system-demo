/**
 * Demo-mode switch.
 *
 * Read in exactly one place, and compared against the literal string 'true'.
 *
 * Vite inlines env vars as strings, so `VITE_DEMO_MODE=false` is the five-
 * character string "false" — truthy. A `Boolean(...)` check here would turn an
 * explicit opt-out into an opt-in, which is the same class of bug as the trigger
 * this flag replaced.
 *
 * The previous demo mode keyed off `VITE_API_URL` being unset, so forgetting to
 * configure the API looked identical to asking for fixtures. Nothing infers the
 * mode now: it is on when someone wrote `VITE_DEMO_MODE=true`, and off
 * otherwise.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
