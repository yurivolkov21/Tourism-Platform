export interface ItineraryLine {
  /** The clock time or phase word before the em-dash (e.g. "17:00", "On arrival"). */
  label: string;
  text: string;
}

/**
 * Itinerary day bodies are free text: one activity per newline, each as
 * `label — text` (label is usually a clock time, sometimes a phase like
 * "On arrival" — never absent in practice, per the fixture data). Splits on
 * the first em-dash only, so a dash inside the activity text itself
 * (e.g. "Dinner — a sunset party") stays part of `text`.
 */
export function parseItineraryLines(body: string): ItineraryLine[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = line.match(/\s*—\s*/);
      if (!match || match.index == null) {
        return { label: '', text: line };
      }
      const label = line.slice(0, match.index).trim();
      const text = line.slice(match.index + match[0].length).trim();
      return { label, text };
    });
}
