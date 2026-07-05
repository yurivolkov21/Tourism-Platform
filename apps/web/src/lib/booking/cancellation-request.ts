/** Shapes the cancellation-request body; omits an empty reason. */
export function buildCancellationRequestBody(reason: string): { reason?: string } {
  const trimmed = reason.trim();
  return trimmed ? { reason: trimmed } : {};
}
