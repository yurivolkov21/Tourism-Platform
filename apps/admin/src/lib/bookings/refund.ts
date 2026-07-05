/**
 * Parses and validates a partial-refund amount entered by an admin against the
 * booking total. Pure: enforces `0 < amount <= total` with at most 2 decimals.
 */
export function validateRefundAmount(
  input: string,
  total: string,
): { amount?: number; error?: string } {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { error: 'Enter a valid amount (up to 2 decimals).' };
  }
  const amount = Number(trimmed);
  const max = Number(total);
  if (amount <= 0) return { error: 'Amount must be greater than 0.' };
  if (Number.isFinite(max) && amount > max) return { error: `Amount cannot exceed the total (${total}).` };
  return { amount };
}
