/**
 * Shared field styling for the marketing lead-capture forms (Contact · Plan-trip · Enquiry).
 * They use a slightly taller field with a subtle shadow on a card — a deliberate, more prominent
 * look than the compact design-system default. Centralised here so the three forms stay in sync.
 *
 * Scoped to these lead forms on purpose: functional forms (booking, auth, account) keep the compact
 * default. Bump these constants to re-tune all three at once.
 */

/** Input / DatePicker field: taller (h-10) with a card-friendly background + subtle shadow. */
export const LEAD_FIELD_CLASS = 'bg-background h-10 shadow-xs';

/**
 * Select trigger: same look, but the height must override the component's `data-[size=default]:h-8`
 * variant (matching the variant lets tailwind-merge win cleanly — no `!important`).
 */
export const LEAD_SELECT_CLASS = 'bg-background w-full shadow-xs data-[size=default]:h-10';

/** Textarea: card background + subtle shadow; height is driven by `rows`, not fixed. */
export const LEAD_TEXTAREA_CLASS = 'bg-background shadow-xs';
