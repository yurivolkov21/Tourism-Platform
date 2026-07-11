'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Updater, VisibilityState } from '@tanstack/react-table';

import { columnPrefsKey, parseStoredVisibility } from '../../lib/table-prefs';

/**
 * `VisibilityState` that survives reloads: starts with the defaults (so the
 * server-rendered HTML never depends on browser storage — no hydration
 * mismatch), applies the stored value in a mount effect, and writes every
 * change back under the table's namespaced key. Storage failures (privacy
 * mode, quota) degrade to the old per-session behavior.
 */
export function usePersistentColumnVisibility(
  tableId: string,
): [VisibilityState, (updater: Updater<VisibilityState>) => void] {
  const [visibility, setVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    try {
      const stored = parseStoredVisibility(
        window.localStorage.getItem(columnPrefsKey(tableId)),
      );
      if (stored) setVisibility(stored);
    } catch {
      // Storage unavailable — keep the defaults.
    }
  }, [tableId]);

  const setAndPersist = useCallback(
    (updater: Updater<VisibilityState>) => {
      setVisibility((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        try {
          window.localStorage.setItem(
            columnPrefsKey(tableId),
            JSON.stringify(next),
          );
        } catch {
          // Best-effort persistence only.
        }
        return next;
      });
    },
    [tableId],
  );

  return [visibility, setAndPersist];
}
