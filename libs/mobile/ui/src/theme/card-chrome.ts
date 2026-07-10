import { Platform, StyleSheet, type ViewStyle } from 'react-native';

import { color, type AppTheme } from './theme';

/** Shared iOS/Android elevation used by listing cards (Tours, Trips, etc.). */
export function cardElevation(
  theme: AppTheme,
  options?: { subdued?: boolean },
): ViewStyle {
  const subdued = options?.subdued ?? false;
  return (
    Platform.select({
      ios: {
        shadowColor: color(theme, 'foreground'),
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: subdued ? 0.04 : 0.08,
        shadowRadius: 12,
      },
      android: { elevation: subdued ? 2 : 4 },
      default: {},
    }) ?? {}
  );
}

export function cardShell(theme: AppTheme, options?: { subdued?: boolean }): ViewStyle {
  return {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: color(theme, 'card'),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color(theme, 'border'),
    ...cardElevation(theme, options),
  };
}

export function cardPressedStyle(): ViewStyle {
  return { opacity: 0.94, transform: [{ scale: 0.995 }] };
}

/** Standard hairline divider between card body and pricing rail. */
export function cardSectionDivider(theme: AppTheme): ViewStyle {
  return {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color(theme, 'border'),
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  };
}
