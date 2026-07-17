import { useEffect, useRef, type ComponentProps } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AppText, color, useTheme } from '@tourism/mobile-ui';

type ActiveChip = {
  facet: string;
  value: string;
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

type ToursListingControlsBaseProps = {
  hideSearch?: boolean;
  embedded?: boolean;
  resultCountLabel: string;
  refineLabel: string;
  activeCount: number;
  onRefinePress: () => void;
  clearAllLabel: string;
  activeChips: ActiveChip[];
  onRemoveChip: (facet: string, value: string) => void;
  onClearAll: () => void;
  /** Optional layout toggle — shown left of the filter button (Destinations). */
  viewMode?: 'vertical' | 'horizontal';
  viewModeLabel?: string;
  onViewModePress?: () => void;
};

type ToursListingControlsProps = ToursListingControlsBaseProps &
  (
    | {
        hideSearch?: false;
        query: string;
        onQueryChange: (value: string) => void;
        searchPlaceholder: string;
      }
    | {
        hideSearch: true;
        query?: string;
        onQueryChange?: (value: string) => void;
        searchPlaceholder?: string;
      }
  );

const AnimatedView = Animated.createAnimatedComponent(View);

function ChromeIconButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = createRefineStyles(theme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Ionicons name={icon} size={20} color={color(theme, 'primary')} />
    </Pressable>
  );
}

function RefineButton({
  label,
  badge,
  onPress,
}: {
  label: string;
  badge: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = createRefineStyles(theme);
  const badgeScale = useSharedValue(badge > 0 ? 1 : 0.9);
  const prevBadgeRef = useRef(badge);

  useEffect(() => {
    const prev = prevBadgeRef.current;
    if (prev === 0 && badge > 0) {
      badgeScale.value = 0.9;
      badgeScale.value = withSpring(1, { damping: 20, stiffness: 400 });
    }
    prevBadgeRef.current = badge;
  }, [badge, badgeScale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Ionicons
        name="options-outline"
        size={20}
        color={color(theme, 'primary')}
      />
      {badge > 0 ? (
        <AnimatedView style={[styles.badge, badgeStyle]}>
          <AppText variant="caption" style={styles.badgeText}>
            {badge}
          </AppText>
        </AnimatedView>
      ) : null}
    </Pressable>
  );
}

export function ToursListingControls({
  query = '',
  onQueryChange,
  searchPlaceholder = '',
  hideSearch = false,
  embedded = false,
  resultCountLabel,
  refineLabel,
  activeCount,
  onRefinePress,
  clearAllLabel,
  activeChips,
  onRemoveChip,
  onClearAll,
  viewMode,
  viewModeLabel,
  onViewModePress,
}: ToursListingControlsProps) {
  const theme = useTheme();
  const styles = createStyles(theme, embedded);
  const showViewMode =
    viewMode != null && onViewModePress != null && viewModeLabel != null;

  return (
    <View style={styles.root}>
      {hideSearch ? null : (
        <View style={styles.searchWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color={color(theme, 'muted-foreground')}
            style={styles.searchIcon}
          />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={color(theme, 'muted-foreground')}
            style={styles.search}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      )}

      <View style={styles.controlRow}>
        <AppText variant="body" style={styles.resultCount} numberOfLines={1}>
          {resultCountLabel}
        </AppText>
        <View style={styles.actions}>
          {showViewMode ? (
            <ChromeIconButton
              label={viewModeLabel}
              icon={
                viewMode === 'vertical'
                  ? 'phone-portrait-outline'
                  : 'phone-landscape-outline'
              }
              onPress={onViewModePress}
            />
          ) : null}
          <RefineButton
            label={refineLabel}
            badge={activeCount}
            onPress={onRefinePress}
          />
        </View>
      </View>

      {activeChips.length > 0 ? (
        <View style={styles.chipsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipsScroll}
          >
            {activeChips.map((chip) => (
              <Pressable
                key={`${chip.facet}-${chip.value}`}
                onPress={() => onRemoveChip(chip.facet, chip.value)}
                style={({ pressed }) => [
                  styles.chip,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                {chip.icon ? (
                  <Ionicons
                    name={chip.icon}
                    size={13}
                    color={color(theme, 'primary')}
                  />
                ) : null}
                <AppText variant="caption" style={styles.chipText}>
                  {chip.label}
                </AppText>
                <Ionicons
                  name="close"
                  size={13}
                  color={color(theme, 'primary')}
                />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClearAll}
            hitSlop={8}
            style={styles.clearAllButton}
          >
            <AppText variant="caption" style={styles.clearAll}>
              {clearAllLabel}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function createRefineStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    button: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'card'),
      borderWidth: 1,
      borderColor: color(theme, 'input'),
    },
    buttonPressed: {
      backgroundColor: color(theme, 'muted'),
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      backgroundColor: color(theme, 'destructive'),
      borderWidth: 2,
      borderColor: color(theme, 'card'),
    },
    badgeText: {
      color: color(theme, 'primary-foreground'),
      fontFamily: theme.fonts.sansSemibold,
      fontSize: 10,
      lineHeight: 12,
    },
  });
}

function createStyles(theme: ReturnType<typeof useTheme>, embedded: boolean) {
  return StyleSheet.create({
    root: {
      gap: theme.spacing.xs,
      paddingBottom: embedded ? 0 : theme.spacing.sm,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      minHeight: theme.minTouch,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: color(theme, 'input'),
      backgroundColor: color(theme, 'card'),
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.sm,
    },
    searchIcon: {
      marginRight: theme.spacing.xs,
    },
    search: {
      flex: 1,
      fontFamily: theme.fonts.sans,
      fontSize: theme.typography.caption,
      color: color(theme, 'foreground'),
      paddingVertical: theme.spacing.sm,
    },
    controlRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.xs,
      gap: theme.spacing.md,
    },
    resultCount: {
      flex: 1,
      fontFamily: theme.fonts.sansSemibold,
      color: color(theme, 'foreground'),
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    clearAll: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansMedium,
    },
    clearAllButton: {
      paddingLeft: theme.spacing.sm,
      paddingVertical: 6,
    },
    chipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    chipsScroll: {
      flex: 1,
      minWidth: 0,
    },
    chips: {
      gap: theme.spacing.sm,
      alignItems: 'center',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: color(theme, 'primary'),
      backgroundColor: color(theme, 'muted'),
    },
    chipPressed: {
      opacity: 0.88,
    },
    chipText: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansMedium,
    },
  });
}
