import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { AppText, color, useTheme } from '@tourism/mobile-ui';

import { SEARCH_OVERLAY_ENTER_Y } from './tours-search.constants';

type ToursSearchRecentPanelProps = {
  searchRecentLabel: string;
  query: string;
  recentTerms: string[];
  searchActive: boolean;
  hasSubmitted: boolean;
  overlayProgress: SharedValue<number>;
  onRecentPress: (term: string) => void;
};

export function ToursSearchRecentPanel({
  searchRecentLabel,
  query,
  recentTerms,
  searchActive,
  hasSubmitted,
  overlayProgress,
  onRecentPress,
}: ToursSearchRecentPanelProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const muted = color(theme, 'muted-foreground');

  const panelMotionStyle = useAnimatedStyle(() => {
    const p = overlayProgress.value;
    const visible = searchActive && !hasSubmitted && !query.trim() && recentTerms.length > 0;
    if (!visible) {
      return { opacity: 0, transform: [{ translateY: SEARCH_OVERLAY_ENTER_Y }, { scale: 0.97 }] };
    }
    return {
      opacity: interpolate(p, [0.2, 0.85], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0.2, 1], [SEARCH_OVERLAY_ENTER_Y, 0], Extrapolation.CLAMP) },
        { scale: interpolate(p, [0.2, 1], [0.97, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  if (recentTerms.length === 0) {
    return null;
  }

  const canShowPanel = searchActive && !hasSubmitted && !query.trim();

  return (
    <Animated.View
      style={[styles.overlay, panelMotionStyle]}
      pointerEvents={canShowPanel ? 'box-none' : 'none'}
    >
      <View style={styles.panel} pointerEvents={canShowPanel ? 'auto' : 'none'}>
          <AppText variant="caption" muted style={styles.recentHeading}>
            {searchRecentLabel}
          </AppText>
          {recentTerms.map((term) => (
            <Pressable
              key={term}
              accessibilityRole="button"
              onPress={() => onRecentPress(term)}
              style={({ pressed }) => [styles.recentRow, pressed && styles.recentPressed]}
            >
              <Ionicons name="time-outline" size={16} color={muted} />
              <AppText variant="body" style={styles.recentLabel}>
                {term}
              </AppText>
            </Pressable>
          ))}
      </View>
    </Animated.View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      paddingTop: theme.spacing.xs,
    },
    panel: {
      marginHorizontal: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      backgroundColor: color(theme, 'card'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      gap: theme.spacing.xs,
      shadowColor: color(theme, 'foreground'),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    recentHeading: {
      fontFamily: theme.fonts.sansSemibold,
      marginBottom: theme.spacing.xs,
    },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    recentPressed: {
      opacity: 0.65,
    },
    recentLabel: {
      color: color(theme, 'foreground'),
    },
  });
}
