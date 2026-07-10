import { useContext } from 'react';
import { Platform, StatusBar } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

function useSafeAreaInsetsOrZero() {
  const insets = useContext(SafeAreaInsetsContext);
  return insets ?? { top: 0, left: 0, right: 0, bottom: 0 };
}

/** Status bar inset — Android edge-to-edge often reports 0 until window insets apply. */
export function useTopSafeInset(): number {
  const insets = useSafeAreaInsetsOrZero();
  const androidFallback =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 28) : 0;
  return Math.max(insets.top, androidFallback);
}

export function useBottomSafeInset(min = 0): number {
  const insets = useSafeAreaInsetsOrZero();
  return Math.max(insets.bottom, min);
}
