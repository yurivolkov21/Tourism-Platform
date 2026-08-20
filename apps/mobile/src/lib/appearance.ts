import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorScheme } from '@tourism/mobile-ui';

/**
 * Appearance preference. One key, one meaning — `system` defers to the OS,
 * `light`/`dark` pin the scheme. Storage failures NEVER block the app: a read
 * error means "use system", a write error means the choice is lost on the next
 * launch, both harmless.
 */
export type AppearancePref = 'system' | 'light' | 'dark';

export const APPEARANCE_KEY = 'nexora.appearance';

const PREFS: readonly AppearancePref[] = ['system', 'light', 'dark'];

/**
 * The scheme actually rendered. `system` with no OS answer yet resolves dark —
 * the app is dark-first, and a white first frame reads as a flash.
 */
export function resolveScheme(
  pref: AppearancePref,
  osScheme: ColorScheme | null | undefined,
): ColorScheme {
  if (pref !== 'system') return pref;
  return osScheme === 'light' ? 'light' : 'dark';
}

export async function readAppearance(): Promise<AppearancePref> {
  try {
    const stored = await AsyncStorage.getItem(APPEARANCE_KEY);
    return PREFS.find((p) => p === stored) ?? 'system';
  } catch {
    return 'system';
  }
}

export async function saveAppearance(pref: AppearancePref): Promise<void> {
  try {
    await AsyncStorage.setItem(APPEARANCE_KEY, pref);
  } catch {
    // Non-fatal: the app keeps the choice for this session only.
  }
}
