import { toCsv } from './csv';

const row = (
  over: Partial<{
    email: string;
    source: string | null;
    subscribedAt: string;
  }> = {},
) => ({
  email: 'jane@example.com',
  source: 'footer',
  subscribedAt: '2026-07-05T08:00:00.000Z',
  ...over,
});

describe('toCsv', () => {
  it('emits a header row plus one quoted line per subscriber', () => {
    const csv = toCsv([row()]);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe('"email","source","subscribed_at"');
    expect(lines[1]).toBe(
      '"jane@example.com","footer","2026-07-05T08:00:00.000Z"',
    );
  });

  it('doubles inner quotes and renders null source as empty', () => {
    const csv = toCsv([row({ email: 'a"b@x.com', source: null })]);
    expect(csv).toContain('"a""b@x.com","",');
  });

  it('guards leading formula characters against spreadsheet injection', () => {
    const csv = toCsv([row({ email: '=HYPERLINK(1)@x.com' })]);
    expect(csv).toContain(`"'=HYPERLINK(1)@x.com"`);
  });

  it('produces just the header for zero rows', () => {
    expect(toCsv([]).trimEnd()).toBe('"email","source","subscribed_at"');
  });
});
