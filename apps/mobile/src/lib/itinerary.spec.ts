import { parseItineraryLines } from './itinerary';

test('splits each newline-separated line into a label/text pair on the em-dash', () => {
  const body =
    'On arrival — Airport transfer and hotel check-in.\n17:00 — A 4.5-hour Vespa tour of the Old Quarter.';
  expect(parseItineraryLines(body)).toEqual([
    { label: 'On arrival', text: 'Airport transfer and hotel check-in.' },
    { label: '17:00', text: 'A 4.5-hour Vespa tour of the Old Quarter.' },
  ]);
});

test('treats a line with no em-dash as text with no label', () => {
  expect(parseItineraryLines('Free morning to explore on your own.')).toEqual([
    { label: '', text: 'Free morning to explore on your own.' },
  ]);
});

test('drops blank lines', () => {
  const body = '08:00 — Breakfast.\n\n\n12:00 — Lunch.';
  expect(parseItineraryLines(body)).toEqual([
    { label: '08:00', text: 'Breakfast.' },
    { label: '12:00', text: 'Lunch.' },
  ]);
});

test('only splits on the first em-dash — later ones stay in the text', () => {
  expect(
    parseItineraryLines('19:00 — Dinner — a sunset party on deck.'),
  ).toEqual([{ label: '19:00', text: 'Dinner — a sunset party on deck.' }]);
});

test('trims stray whitespace around the label and text', () => {
  expect(parseItineraryLines('  08:00   —   Breakfast.  ')).toEqual([
    { label: '08:00', text: 'Breakfast.' },
  ]);
});

test('empty body returns no lines', () => {
  expect(parseItineraryLines('')).toEqual([]);
  expect(parseItineraryLines('   \n  ')).toEqual([]);
});
