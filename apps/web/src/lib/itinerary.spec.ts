import { parseItinerary } from './itinerary';

describe('parseItinerary', () => {
  it('splits a single time milestone', () => {
    expect(parseItinerary('10:30 Visit Hoa Lu')).toEqual([{ time: '10:30', text: 'Visit Hoa Lu' }]);
  });

  it('handles a time range and a colon separator', () => {
    expect(parseItinerary('07:30–08:00: Get picked up by your guide')).toEqual([
      { time: '07:30–08:00', text: 'Get picked up by your guide' },
    ]);
  });

  it('handles an em-dash separator', () => {
    expect(parseItinerary('09:15 — Short break for photos')).toEqual([
      { time: '09:15', text: 'Short break for photos' },
    ]);
  });

  it('parses multiple newline-separated milestones', () => {
    const body = '07:30 Pickup\n10:30 Visit Hoa Lu\n11:45 Lunch';
    expect(parseItinerary(body)).toEqual([
      { time: '07:30', text: 'Pickup' },
      { time: '10:30', text: 'Visit Hoa Lu' },
      { time: '11:45', text: 'Lunch' },
    ]);
  });

  it('keeps a plain line as text-only (no time)', () => {
    expect(parseItinerary('Overnight on board the cruise.')).toEqual([
      { text: 'Overnight on board the cruise.' },
    ]);
  });

  it('mixes timed and untimed lines and drops blanks', () => {
    const body = 'Arrival day — take it easy.\n\n19:00 Welcome dinner';
    expect(parseItinerary(body)).toEqual([
      { text: 'Arrival day — take it easy.' },
      { time: '19:00', text: 'Welcome dinner' },
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(parseItinerary('   \n  ')).toEqual([]);
  });
});
