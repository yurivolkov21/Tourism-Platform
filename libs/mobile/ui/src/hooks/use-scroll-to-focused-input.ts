import { useCallback, useEffect, useRef, type RefObject } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  View,
} from 'react-native';

import {
  KEYBOARD_SAFETY_PADDING,
  KEYBOARD_SCROLL_ANIM_MS,
} from '../keyboard/constants';

export type ScrollToInputOptions = {
  safetyPadding?: number;
  anchorRef?: RefObject<View | null>;
};

type ScrollToFocusedInputOptions = {
  headerHeight?: number;
  safetyPadding?: number;
};

const FOCUS_DELAY_MS = Platform.OS === 'ios' ? 50 : 80;

function readKeyboardTop(event: KeyboardEvent): number {
  return event.endCoordinates.screenY;
}

function readKeyboardDuration(event: KeyboardEvent): number {
  const duration = event.duration ?? KEYBOARD_SCROLL_ANIM_MS;
  return Math.min(Math.max(duration, 0), KEYBOARD_SCROLL_ANIM_MS);
}

export function useScrollToFocusedInput(
  scrollRef: RefObject<ScrollView | null>,
  contentRef: RefObject<View | null>,
  options: ScrollToFocusedInputOptions = {},
) {
  const { headerHeight = 0, safetyPadding = KEYBOARD_SAFETY_PADDING } = options;
  const scrollYRef = useRef(0);
  const focusedRef = useRef<RefObject<View | null> | null>(null);
  const focusedOptionsRef = useRef<ScrollToInputOptions>({});
  const keyboardTopRef = useRef(0);
  const keyboardDurationRef = useRef(KEYBOARD_SCROLL_ANIM_MS);

  const scrollFocusedIntoView = useCallback(
    (inputRef: RefObject<View | null>, scrollOptions: ScrollToInputOptions = {}) => {
      const measureRef = scrollOptions.anchorRef ?? inputRef;
      const padding = scrollOptions.safetyPadding ?? safetyPadding;
      const input = inputRef.current;
      const anchor = measureRef.current;
      const scroll = scrollRef.current;
      const content = contentRef.current;
      if (!input || !anchor || !scroll || !content) return;

      const keyboardTop =
        keyboardTopRef.current > 0
          ? keyboardTopRef.current
          : Dimensions.get('window').height;

      anchor.measureInWindow((_ax, ay, _aw, ah) => {
        const clusterTop = ay;
        const clusterBottom = ay + ah;
        const visibleTop = headerHeight + padding;
        const visibleBottom = keyboardTop - padding;

        const coveredByKeyboard = clusterBottom > visibleBottom;
        const tooHigh = clusterTop < visibleTop;

        if (!coveredByKeyboard && !tooHigh) return;

        anchor.measureLayout(
          content,
          (_x, y, _w, height) => {
            const clusterBottomInContent = y + height;
            const overlap = Math.max(
              clusterBottom - visibleBottom,
              visibleTop - clusterTop,
              0,
            );
            const targetY =
              overlap > 0
                ? scrollYRef.current + overlap
                : Math.max(0, clusterBottomInContent - (visibleBottom - visibleTop));
            scroll.scrollTo({
              y: Math.max(0, targetY),
              animated: true,
            });
          },
          () => {
            const overlap = Math.max(
              clusterBottom - visibleBottom,
              visibleTop - clusterTop,
              0,
            );
            scroll.scrollTo({
              y: Math.max(0, scrollYRef.current + overlap),
              animated: true,
            });
          },
        );
      });
    },
    [contentRef, headerHeight, safetyPadding, scrollRef],
  );

  const scheduleScroll = useCallback(
    (
      inputRef: RefObject<View | null>,
      delayMs: number,
      scrollOptions: ScrollToInputOptions = {},
    ) => {
      requestAnimationFrame(() => {
        setTimeout(() => scrollFocusedIntoView(inputRef, scrollOptions), delayMs);
      });
    },
    [scrollFocusedIntoView],
  );

  const scrollToInput = useCallback(
    (inputRef: RefObject<View | null>, scrollOptions: ScrollToInputOptions = {}) => {
      focusedRef.current = inputRef;
      focusedOptionsRef.current = scrollOptions;
      scheduleScroll(inputRef, FOCUS_DELAY_MS, scrollOptions);
    },
    [scheduleScroll],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardTopRef.current = readKeyboardTop(event);
      keyboardDurationRef.current = readKeyboardDuration(event);
      if (focusedRef.current) {
        scheduleScroll(
          focusedRef.current,
          keyboardDurationRef.current,
          focusedOptionsRef.current,
        );
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = 0;
      keyboardDurationRef.current = KEYBOARD_SCROLL_ANIM_MS;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scheduleScroll]);

  return { scrollToInput, onScroll, dismissKeyboard };
}
