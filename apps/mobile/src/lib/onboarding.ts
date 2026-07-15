import AsyncStorage from '@react-native-async-storage/async-storage';

/** P5.7 S1: first-launch onboarding gate. One key, one meaning — the user
 * has passed (or skipped) the intro pager. Storage failures NEVER block the
 * app: read errors mean "show onboarding", write errors mean "show it again
 * next launch" — both safe. */
export const ONBOARDED_KEY = 'nexora.onboarded';

export async function readOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // Non-fatal: the pager will simply show once more on the next launch.
  }
}
