'use client';

import { useState, useTransition } from 'react';
import { RotateCcw } from 'lucide-react';

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
} from '@tourism/ui';

import { refundBooking } from '../../lib/bookings/actions';
import { canRefund, formatMoney, type BookingStatus } from '../../lib/bookings/format';

/**
 * Refund control for a booking's detail page. Enabled only when the booking is PAID (`canRefund`);
 * otherwise it renders a disabled button with a hint. Confirming opens a dialog with an optional
 * reason (audit) and calls the `refundBooking` server action — a failure keeps the dialog open and
 * shows the reason; success closes it and the server re-renders the booking as REFUNDED.
 */
export function RefundBooking({
  code,
  status,
  totalAmount,
  currency,
}: {
  code: string;
  status: BookingStatus;
  totalAmount: string;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canRefund(status)) {
    return (
      <Button variant="outline" disabled title="Only a paid booking can be refunded">
        <RotateCcw data-icon="inline-start" />
        Refund
      </Button>
    );
  }

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await refundBooking(code, reason);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setReason('');
      }
    });
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <RotateCcw data-icon="inline-start" />
        Refund booking
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
            <AlertDialogTitle>Refund {formatMoney(totalAmount, currency)}?</AlertDialogTitle>
            <AlertDialogDescription>
              This refunds the traveller through Stripe and releases their seats back to the
              departure. It can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Field className="gap-2">
            <FieldLabel htmlFor="refund-reason">Reason (optional)</FieldLabel>
            <Textarea
              id="refund-reason"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer cancelled within the free window"
            />
          </Field>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep booking</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirm} disabled={pending}>
              {pending ? 'Refunding…' : 'Refund now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default RefundBooking;
