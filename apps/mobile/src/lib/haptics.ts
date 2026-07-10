import * as Haptics from 'expo-haptics';

/**
 * Fire-and-forget haptics for meaningful moments only (selection toggles,
 * booking success, destructive confirms) — never plain navigation. Failures
 * are swallowed: haptics must never break a flow.
 */
export function hapticSelect(): void {
  Haptics.selectionAsync().catch(() => undefined);
}

export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => undefined,
  );
}

export function hapticWarning(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
    () => undefined,
  );
}
