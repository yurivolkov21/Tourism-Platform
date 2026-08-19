'use client';

import { CheckIcon, Loader2Icon } from 'lucide-react';

import { Button } from '@tourism/ui';

import type { SaveState } from '../../hooks/use-save-state';

/**
 * Submit button that morphs through its three states, so the confirmation lands on the control the
 * user just pressed instead of only in the corner toast. The state is owned by `useSaveState`; this
 * is presentation only.
 *
 * A minimum width stops the button resizing as the label swaps.
 */
export function SaveButton({
  state,
  label,
  pendingLabel,
  doneLabel,
  disabled = false,
}: {
  state: SaveState;
  label: string;
  pendingLabel: string;
  doneLabel: string;
  /** Locks the button on top of the saving state — e.g. while the form has nothing to save. */
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      disabled={disabled || state === 'saving'}
      className="min-w-36 justify-center gap-2"
    >
      {state === 'saving' ? (
        <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      {state === 'done' ? (
        <CheckIcon className="size-4" aria-hidden="true" />
      ) : null}
      {state === 'saving' ? pendingLabel : state === 'done' ? doneLabel : label}
    </Button>
  );
}

export default SaveButton;
