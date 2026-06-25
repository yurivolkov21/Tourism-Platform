/** One itinerary milestone: an optional leading time and its activity text. */
export interface ItineraryMilestone {
  time?: string;
  text: string;
}

// Leading time token ("08:00" or a range "07:30–08:00"), then an optional
// separator (– — - :) before the activity text.
const TIME_LINE = /^(\d{1,2}:\d{2}(?:\s*[–—-]\s*\d{1,2}:\d{2})?)\s*[–—:-]?\s*(.*)$/;

/**
 * Parse an itinerary day's `description` into milestones. Each non-empty line
 * becomes one milestone; a leading `HH:MM` (or `HH:MM–HH:MM`) is split into
 * `time`. Plain single-line descriptions yield a single text-only milestone
 * (backward compatible with the old short-sentence seed).
 */
export function parseItinerary(body: string): ItineraryMilestone[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = TIME_LINE.exec(line);
      if (match && match[2]) {
        return { time: match[1].replace(/\s+/g, ''), text: match[2].trim() };
      }
      return { text: line };
    });
}
