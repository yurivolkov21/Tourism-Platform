import { useEffect, useRef, type RefObject } from 'react';
import PagerView from 'react-native-pager-view';
import Animated, { type SharedValue, useEvent } from 'react-native-reanimated';

export const AnimatedBrowsePager = Animated.createAnimatedComponent(PagerView);

export function useBrowsePagerRef() {
  return useRef<PagerView>(null);
}

/** Keeps tab indicator in sync on the UI thread — avoids JS bridge jank during swipe. */
export function useBrowsePagerScrollHandler(scrollProgress: SharedValue<number>) {
  return useEvent(
    (event: { position: number; offset: number }) => {
      'worklet';
      scrollProgress.value = event.position + event.offset;
    },
    ['onPageScroll'],
  );
}

/** Reposition pager after rotation without animating. */
export function useRepositionBrowsePagerOnResize(
  pagerRef: RefObject<PagerView | null>,
  scrollProgress: SharedValue<number>,
  pageIndex: number,
  width: number,
) {
  useEffect(() => {
    pagerRef.current?.setPageWithoutAnimation(pageIndex);
    scrollProgress.value = pageIndex;
  }, [pageIndex, pagerRef, scrollProgress, width]);
}
