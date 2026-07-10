import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import {
  useAnimatedScrollHandler,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useBottomSafeInset } from '@tourism/mobile-ui';

import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_MARGIN,
} from './floating-tab-bar.constants';

const HIDE_THRESHOLD = 56;
const SHOW_DELTA = 16;

export const tabBarSpringConfig = {
  damping: 20,
  stiffness: 220,
  mass: 0.85,
};

type TabBarVisibilityContextValue = {
  tabBarOffset: SharedValue<number>;
  hideDistance: number;
  show: () => void;
  hide: () => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(
  null,
);

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const bottomInset = useBottomSafeInset(FLOATING_TAB_BAR_MARGIN);
  const hideDistance = FLOATING_TAB_BAR_HEIGHT + bottomInset;
  const tabBarOffset = useSharedValue(0);
  const hideDistanceSV = useSharedValue(hideDistance);

  useEffect(() => {
    hideDistanceSV.value = hideDistance;
  }, [hideDistance, hideDistanceSV]);

  const show = useCallback(() => {
    tabBarOffset.value = withSpring(0, tabBarSpringConfig);
  }, [tabBarOffset]);

  const hide = useCallback(() => {
    tabBarOffset.value = withSpring(hideDistanceSV.value, tabBarSpringConfig);
  }, [hideDistanceSV, tabBarOffset]);

  const value = useMemo(
    () => ({
      tabBarOffset,
      hideDistance,
      show,
      hide,
    }),
    [tabBarOffset, hideDistance, show, hide],
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility(): TabBarVisibilityContextValue {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) {
    throw new Error('useTabBarVisibility must be used within TabBarVisibilityProvider');
  }
  return ctx;
}

export function useHideTabBarOnScroll() {
  const { tabBarOffset, hideDistance } = useTabBarVisibility();
  const lastScrollY = useSharedValue(0);
  const scrollAnchorY = useSharedValue(0);
  const hideDistanceSV = useSharedValue(hideDistance);

  useEffect(() => {
    hideDistanceSV.value = hideDistance;
  }, [hideDistance, hideDistanceSV]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;

      if (currentY <= 0) {
        tabBarOffset.value = withSpring(0, tabBarSpringConfig);
        scrollAnchorY.value = 0;
      } else if (currentY < lastScrollY.value - SHOW_DELTA) {
        tabBarOffset.value = withSpring(0, tabBarSpringConfig);
        scrollAnchorY.value = currentY;
      } else if (
        currentY > lastScrollY.value &&
        currentY - scrollAnchorY.value >= HIDE_THRESHOLD
      ) {
        tabBarOffset.value = withSpring(hideDistanceSV.value, tabBarSpringConfig);
      }

      lastScrollY.value = currentY;
    },
    onEndDrag: (event) => {
      if (event.contentOffset.y > 0) {
        tabBarOffset.value = withSpring(0, tabBarSpringConfig);
      }
    },
    onMomentumEnd: (event) => {
      if (event.contentOffset.y > 0) {
        tabBarOffset.value = withSpring(0, tabBarSpringConfig);
      }
    },
  });

  return { onScroll, scrollEventThrottle: 16 as const };
}
