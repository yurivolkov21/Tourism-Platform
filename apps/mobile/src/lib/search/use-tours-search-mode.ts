import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, type TextInput } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';

import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_RECENT_MAX,
  SEARCH_OVERLAY_SPRING_CLOSE,
  SEARCH_OVERLAY_SPRING_OPEN,
  SEARCH_SPRING_CLOSE,
  SEARCH_SPRING_OPEN,
} from '../../components/tours/tours-search.constants';

function pushRecentTerm(terms: string[], term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return terms;
  const next = [trimmed, ...terms.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())];
  return next.slice(0, SEARCH_RECENT_MAX);
}

export function useToursSearchMode() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [recentTerms, setRecentTerms] = useState<string[]>([]);
  /** 0 = collapsed icon + title visible · 1 = expanded search bar */
  const progress = useSharedValue(0);
  /** 0 = overlay hidden · 1 = backdrop + recent visible */
  const overlayProgress = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const commitRecent = useCallback((term: string) => {
    setRecentTerms((current) => pushRecentTerm(current, term));
  }, []);

  const expandBar = useCallback(
    (expanded: boolean) => {
      const target = expanded ? 1 : 0;
      if (Math.abs(progress.value - target) < 0.02) {
        progress.value = target;
        return;
      }
      progress.value = withSpring(target, expanded ? SEARCH_SPRING_OPEN : SEARCH_SPRING_CLOSE);
    },
    [progress],
  );

  const expandOverlay = useCallback(
    (expanded: boolean) => {
      const target = expanded ? 1 : 0;
      if (Math.abs(overlayProgress.value - target) < 0.02) {
        overlayProgress.value = target;
        return;
      }
      overlayProgress.value = withSpring(
        target,
        expanded ? SEARCH_OVERLAY_SPRING_OPEN : SEARCH_OVERLAY_SPRING_CLOSE,
      );
    },
    [overlayProgress],
  );

  const openSearch = useCallback(() => {
    setIsActive(true);
    setHasSubmitted(false);
    expandBar(true);
    expandOverlay(true);
    setTimeout(() => inputRef.current?.focus(), 160);
  }, [expandBar, expandOverlay]);

  const closeSearch = useCallback(() => {
    setIsActive(false);
    setHasSubmitted(false);
    setQuery('');
    setDebouncedQuery('');
    expandBar(false);
    expandOverlay(false);
    Keyboard.dismiss();
    inputRef.current?.blur();
  }, [expandBar, expandOverlay]);

  const submitSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed) {
      commitRecent(trimmed);
      setDebouncedQuery(trimmed);
      setHasSubmitted(true);
      setIsActive(false);
      expandOverlay(false);
      inputRef.current?.blur();
    }
    Keyboard.dismiss();
  }, [commitRecent, expandOverlay, query]);

  const applySearchTerm = useCallback(
    (term: string) => {
      setQuery(term);
      setDebouncedQuery(term);
      setHasSubmitted(false);
      commitRecent(term);
    },
    [commitRecent],
  );

  const dismissSearchOverlay = useCallback(() => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    setIsActive(false);
    expandOverlay(false);

    const applied = debouncedQuery.trim();
    if (applied) {
      setQuery(applied);
      setHasSubmitted(true);
      return;
    }

    setHasSubmitted(false);
    setQuery('');
    expandBar(false);
  }, [debouncedQuery, expandBar, expandOverlay]);

  const toggleSearch = useCallback(() => {
    if (isActive) {
      closeSearch();
    } else {
      openSearch();
    }
  }, [closeSearch, isActive, openSearch]);

  const clearQuery = useCallback(() => {
    if (query.trim()) {
      setQuery('');
      setDebouncedQuery('');
      setHasSubmitted(false);
      expandBar(false);
      expandOverlay(false);
      return;
    }
    closeSearch();
  }, [closeSearch, expandBar, expandOverlay, query]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setHasSubmitted(false);
  }, []);

  return {
    query,
    setQuery: handleQueryChange,
    debouncedQuery,
    isActive,
    hasSubmitted,
    progress,
    overlayProgress,
    recentTerms,
    inputRef,
    openSearch,
    closeSearch,
    dismissSearchOverlay,
    toggleSearch,
    submitSearch,
    applySearchTerm,
    commitRecent,
    clearQuery,
  };
}
