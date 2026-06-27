/**
 * Pure schedule for the `/checkout/success` auto-confirm poll. While a booking is PENDING (Stripe
 * webhook lag / PayPal capture), the page re-checks itself a bounded number of times with a gentle
 * backoff, then stops and leaves the manual Refresh as the fallback — so it never spins forever.
 */

/** Max auto-polls before giving up (≈ the first ~25s after redirect). */
export const MAX_CONFIRM_POLLS = 8;

/** Delay before the next poll: 2s for the first two, then +1s every two attempts, capped at 5s. */
export function confirmPollDelayMs(attempt: number): number {
  const base = 2000 + Math.floor(Math.max(0, attempt) / 2) * 1000;
  return Math.min(base, 5000);
}

/** Whether to schedule another poll (stops once the cap is reached). */
export function shouldKeepPolling(attempt: number, max: number = MAX_CONFIRM_POLLS): boolean {
  return attempt < max;
}
