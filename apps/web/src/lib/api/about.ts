import { computeAboutMetrics, type AboutMetrics } from '../about-metrics';
import { fetchDestinationTiles } from './destinations';
import { fetchTourCards } from './tours';

/** Real About-page metrics from the live catalog. Zeroed on error (callers default the display). */
export async function fetchAboutMetrics(): Promise<AboutMetrics> {
  const [cards, tiles] = await Promise.all([
    fetchTourCards().catch(() => []),
    fetchDestinationTiles().catch(() => []),
  ]);
  return computeAboutMetrics(cards, tiles);
}
