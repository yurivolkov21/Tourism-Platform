'use client';

import { useState, useTransition } from 'react';
import { Ban } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Field,
  FieldLabel,
  Textarea,
  toast,
} from '@tourism/ui';

import { denyCancellation } from '../../lib/bookings/actions';

/**
 * Deny control for an open cancellation request on a booking's detail page. Confirming opens a
 * dialog with an optional decision note (shown back to the traveller as the reason their request
 * was declined). Calls the `denyCancellation` server action — a failure keeps the dialog open and
 * shows the reason; success closes it and the server re-renders the booking.
 */
export function DenyCancellation({
  requestId,
  code,
}: {
  requestId: string;
  code: string;
}) {
  const [open, setOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await denyCancellation(requestId, code, decisionNote);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success('Cancellation request denied.');
        setOpen(false);
        setDecisionNote('');
      }
    });
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Ban data-icon="inline-start" />
        Deny request
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deny this cancellation request?</AlertDialogTitle>
            <AlertDialogDescription>
              The booking stays as-is — no refund is issued and no seats are
              released. The traveller can see the decision note below.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Field className="gap-2">
            <FieldLabel htmlFor="deny-decision-note">
              Decision note (optional)
            </FieldLabel>
            <Textarea
              id="deny-decision-note"
              rows={3}
              maxLength={500}
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="e.g. Outside the free-cancellation window"
            />
          </Field>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              Keep request
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirm}
              disabled={pending}
            >
              {pending ? 'Denying…' : 'Deny request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DenyCancellation;
