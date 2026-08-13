'use client';

import { useEffect, useState } from 'react';

export type SaveState = 'idle' | 'saving' | 'done';

/**
 * Submit state for the account forms: idle → saving → done, with `done` reverting on its own and a
 * one-shot `flash` for the action bar.
 *
 * "Done" is a confirmation, not a mode — leaving the button reading "Saved" would misreport the
 * next edit. Both timers clear on unmount, so a navigation mid-save can't set state on a component
 * that is already gone.
 */
export function useSaveState() {
  const [state, setState] = useState<SaveState>('idle');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (state !== 'done') return;
    const timer = setTimeout(() => setState('idle'), 1600);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(timer);
  }, [flash]);

  return {
    state,
    flash,
    busy: state === 'saving',
    start: () => setState('saving'),
    /** Back to idle without a confirmation — the caller shows the error. */
    fail: () => setState('idle'),
    succeed: () => {
      setState('done');
      setFlash(true);
    },
  };
}

export default useSaveState;
