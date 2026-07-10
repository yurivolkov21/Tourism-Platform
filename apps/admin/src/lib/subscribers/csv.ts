/** Subscriber projection the CSV export needs (matches `SubscriberDto`). */
export interface CsvSubscriber {
  email: string;
  source: string | null;
  subscribedAt: string;
}

/**
 * Quote one CSV field: always wrapped in double quotes (inner quotes doubled),
 * and leading `= + - @` prefixed with `'` so spreadsheets never evaluate a cell
 * as a formula (CSV-injection guard — the emails are visitor input).
 */
function field(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** Subscribers → CSV (CRLF line ends, header row, ESP-import friendly). */
export function toCsv(rows: CsvSubscriber[]): string {
  const lines = [
    ['email', 'source', 'subscribed_at'].map(field).join(','),
    ...rows.map((r) =>
      [r.email, r.source ?? '', r.subscribedAt].map(field).join(','),
    ),
  ];
  return `${lines.join('\r\n')}\r\n`;
}
