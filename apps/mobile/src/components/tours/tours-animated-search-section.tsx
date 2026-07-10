import { useCallback } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { AppText, color, useTheme } from '@tourism/mobile-ui';

import {
  SEARCH_ICON_SIZE,
  SEARCH_SPRING_OPEN,
  SEARCH_TITLE_EXIT_X,
} from './tours-search.constants';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ToursAnimatedSearchSectionProps = {
  sectionTitle: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchActive: boolean;
  hasSubmitted: boolean;
  searchProgress: SharedValue<number>;
  query: string;
  onQueryChange: (value: string) => void;
  onSearchToggle: () => void;
  onSearchResume: () => void;
  onClear: () => void;
  onSubmit: () => void;
  inputRef: React.RefObject<TextInput | null>;
  compactBottom?: boolean;
};

export function ToursAnimatedSearchSection({
  sectionTitle,
  searchLabel,
  searchPlaceholder,
  searchActive,
  hasSubmitted,
  searchProgress,
  query,
  onQueryChange,
  onSearchToggle,
  onSearchResume,
  onClear,
  onSubmit,
  inputRef,
  compactBottom = false,
}: ToursAnimatedSearchSectionProps) {
  const theme = useTheme();
  const primary = color(theme, 'primary');
  const muted = color(theme, 'muted-foreground');
  const styles = createStyles(theme, compactBottom);
  const rowWidth = useSharedValue(0);

  const onRowLayout = useCallback(
    (event: LayoutChangeEvent) => {
      rowWidth.value = event.nativeEvent.layout.width;
    },
    [rowWidth],
  );

  const showInput = searchActive || (hasSubmitted && query.trim().length > 0);

  const titleStyle = useAnimatedStyle(() => {
    const p = searchProgress.value;
    return {
      opacity: interpolate(p, [0, 0.4], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(p, [0, 1], [0, SEARCH_TITLE_EXIT_X], Extrapolation.CLAMP) },
      ],
    };
  });

  const barStyle = useAnimatedStyle(() => {
    const p = searchProgress.value;
    const expanded = Math.max(rowWidth.value, SEARCH_ICON_SIZE);
    return {
      width: interpolate(p, [0, 1], [SEARCH_ICON_SIZE, expanded], Extrapolation.CLAMP),
      opacity: interpolate(p, [0, 0.25], [0.96, 1], Extrapolation.CLAMP),
    };
  });

  const iconOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchProgress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
  }));

  const inputOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchProgress.value, [0.3, 0.75], [0, 1], Extrapolation.CLAMP),
  }));

  const titleInteractive = !searchActive && !hasSubmitted;

  return (
    <View style={styles.body}>
      <View style={styles.sectionRow} onLayout={onRowLayout}>
        <Animated.View style={[styles.titleWrap, titleStyle]} pointerEvents={titleInteractive ? 'auto' : 'none'}>
          <AppText style={styles.sectionTitle} numberOfLines={1}>
            {sectionTitle}
          </AppText>
        </Animated.View>

        <Animated.View style={[styles.bar, barStyle]}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={searchLabel}
            onPress={onSearchToggle}
            style={[styles.iconTap, iconOpacityStyle]}
            pointerEvents={showInput ? 'none' : 'auto'}
          >
            <Ionicons name="search-outline" size={22} color={primary} />
          </AnimatedPressable>

          <Animated.View
            style={[styles.inputWrap, inputOpacityStyle]}
            pointerEvents={showInput ? 'auto' : 'none'}
          >
            <Ionicons name="search-outline" size={18} color={muted} style={styles.inputIcon} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={onQueryChange}
              onFocus={() => {
                if (hasSubmitted && !searchActive) {
                  onSearchResume();
                }
              }}
              placeholder={searchPlaceholder}
              placeholderTextColor={muted}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={onSubmit}
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel={searchLabel}
            />
            {query.length > 0 || searchActive ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={searchLabel}
                onPress={onClear}
                hitSlop={8}
                style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
              >
                <Ionicons name="close-circle" size={20} color={muted} />
              </Pressable>
            ) : null}
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, compactBottom: boolean) {
  const horizontal = theme.spacing.md;

  return StyleSheet.create({
    body: {
      paddingHorizontal: horizontal,
      paddingBottom: compactBottom ? theme.spacing.xs : theme.spacing.md,
      position: 'relative',
      minHeight: 44,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minHeight: 44,
      position: 'relative',
    },
    titleWrap: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      paddingRight: SEARCH_ICON_SIZE + theme.spacing.sm,
    },
    sectionTitle: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.heading,
      fontSize: 26,
      lineHeight: 32,
      letterSpacing: -0.5,
    },
    bar: {
      height: 44,
      borderRadius: theme.radius.lg,
      backgroundColor: color(theme, 'card'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: color(theme, 'foreground'),
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    iconTap: {
      width: SEARCH_ICON_SIZE,
      height: SEARCH_ICON_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputWrap: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.sm,
    },
    inputIcon: {
      marginRight: theme.spacing.xs,
    },
    input: {
      flex: 1,
      fontFamily: theme.fonts.sans,
      fontSize: theme.typography.body,
      color: color(theme, 'foreground'),
      paddingVertical: theme.spacing.sm,
    },
    clear: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearPressed: {
      opacity: 0.6,
    },
  });
}

export { SEARCH_SPRING_OPEN as SEARCH_SPRING };
