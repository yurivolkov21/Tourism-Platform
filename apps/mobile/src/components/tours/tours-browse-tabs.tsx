import { useCallback } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { color, useTheme } from '@tourism/mobile-ui';

import { BROWSE_TABS, BrowseTabIndex, type BrowseTab } from './tours-browse-types';

const AnimatedText = Animated.createAnimatedComponent(Text);
const UNDERLINE_WIDTH = 40;

type TabLayout = { x: number; width: number };

type ToursBrowseTabsProps = {
  activeBrowseTab: BrowseTab;
  onSelectTab: (tab: BrowseTab) => void;
  labels: Record<BrowseTab, string>;
  scrollProgress: SharedValue<number>;
};

type TabLabelProps = {
  label: string;
  tabIndex: number;
  scrollProgress: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
};

function TabLabel({
  label,
  tabIndex,
  scrollProgress,
  activeColor,
  inactiveColor,
  fontFamily,
  fontSize,
  lineHeight,
}: TabLabelProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = scrollProgress.value;
    const colorRange =
      tabIndex === 0 ? ([activeColor, inactiveColor] as const) : ([inactiveColor, activeColor] as const);

    return {
      color: interpolateColor(progress, [0, 1], colorRange),
    };
  });

  return (
    <AnimatedText
      style={[
        {
          fontFamily,
          fontSize,
          lineHeight,
        },
        animatedStyle,
      ]}
    >
      {label}
    </AnimatedText>
  );
}

export function ToursBrowseTabs({
  activeBrowseTab,
  onSelectTab,
  labels,
  scrollProgress,
}: ToursBrowseTabsProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const activeColor = color(theme, 'primary');
  const inactiveColor = color(theme, 'muted-foreground');

  const toursLayout = useSharedValue<TabLayout>({ x: 0, width: 0 });
  const destinationsLayout = useSharedValue<TabLayout>({ x: 0, width: 0 });

  const onTabLayout = useCallback(
    (tab: BrowseTab) => (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      const layout = { x, width };
      if (tab === 'tours') {
        toursLayout.value = layout;
      } else {
        destinationsLayout.value = layout;
      }
    },
    [destinationsLayout, toursLayout],
  );

  const underlineStyle = useAnimatedStyle(() => {
    const progress = scrollProgress.value;
    const tours = toursLayout.value;
    const destinations = destinationsLayout.value;

    if (tours.width <= 0 || destinations.width <= 0) {
      return { opacity: 0, width: UNDERLINE_WIDTH };
    }

    const tabLeft = tours.x + progress * (destinations.x - tours.x);
    const tabWidth = tours.width + progress * (destinations.width - tours.width);

    return {
      transform: [{ translateX: tabLeft + (tabWidth - UNDERLINE_WIDTH) / 2 }],
      width: UNDERLINE_WIDTH,
      opacity: 1,
    };
  });

  return (
    <View style={styles.root} accessibilityRole="tablist">
      <View style={styles.tabsRow}>
        {BROWSE_TABS.map((tab) => {
          const selected = tab === activeBrowseTab;
          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={labels[tab]}
              onPress={() => onSelectTab(tab)}
              onLayout={onTabLayout(tab)}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            >
              <TabLabel
                label={labels[tab]}
                tabIndex={BrowseTabIndex[tab]}
                scrollProgress={scrollProgress}
                activeColor={activeColor}
                inactiveColor={inactiveColor}
                fontFamily={theme.fonts.sans}
                fontSize={theme.typography.body}
                lineHeight={24}
              />
            </Pressable>
          );
        })}
        <Animated.View style={[styles.underline, underlineStyle]} />
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      alignItems: 'center',
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    tabsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-end',
      gap: theme.spacing.xl,
      position: 'relative',
      paddingBottom: 2,
    },
    tab: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xs,
    },
    tabPressed: {
      opacity: 0.7,
    },
    underline: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: 2,
      borderRadius: 1,
      backgroundColor: color(theme, 'primary'),
    },
  });
}
