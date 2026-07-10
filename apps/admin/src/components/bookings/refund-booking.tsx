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
  Checkbox,
  Field,
  FieldLabel,
  Input,
  Textarea,
  toast,
} from '@tourism/ui';

import { ErrorAlert } from '../crud/error-alert';
import { refundBooking } from '../../lib/bookings/actions';
import { validateRefundAmount } from '../../lib/bookings/refund';
import {
  canRefund,
  formatMoney,
  type BookingStatus,
} from '../../lib/bookings/format';

/**
 * Refund control for a booking's detail page. Enabled only when the booking is PAID (`canRefund`);
 * otherwise it renders a disabled button with a hint. Confirming opens a dialog with an amount
 * (defaults to the full total when there's an open cancellation request, empty otherwise), an optional
 * reason (audit), and — when `hasOpenRequest` is falsy — a mis-click safeguard: a warning banner plus a
 * required confirm checkbox that gates the confirm button, since a refund with no request on file is a
 * proactive action an admin should double-check. Calls the `refundBooking` server action — a failure
 * keeps the dialog open and shows the reason; success closes it and the server re-renders the booking.
 */
export function RefundBooking({
  code,
  status,
  totalAmount,
  currency,
  hasOpenRequest,
}: {
  code: string;
  status: BookingStatus;
  totalAmount: string;
  currency: string;
  hasOpenRequest?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(hasOpenRequest ? totalAmount : '');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canRefund(status)) {
    return (
      <Button
        variant="outline"
        disabled
        title="Only a paid booking can be refunded"
      >
        <RotateCcw data-icon="inline-start" />
        Refund
      </Button>
    );
  }

  // No cancellation request on file → this is a proactive refund, not a response to a traveller's
  // request. Require an explicit checkbox confirmation on top of the AlertDialog itself.
  const requireSafeguard = !hasOpenRequest;

  const confirm = () => {
    setError(null);
    const { amount: parsedAmount, error: amountError } = validateRefundAmount(
      amount,
      totalAmount,
    );
    if (amountError) {
      setError(amountError);
      return;
    }
    const isFull = parsedAmount === Number(totalAmount);
    startTransition(async () => {
      const result = await refundBooking(
        code,
        isFull ? { reason } : { reason, amount: parsedAmount },
      );
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success('Refund issued.');
        setOpen(false);
        setReason('');
        setAmount(hasOpenRequest ? totalAmount : '');
        setConfirmed(false);
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
          if (!next) {
            setError(null);
            setConfirmed(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Refund {formatMoney(totalAmount, currency)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This refunds the traveller through Stripe and releases their seats
              back to the departure. It can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {requireSafeguard ? (
            <ErrorAlert>
              No cancellation request on file — you&apos;re refunding
              proactively.
            </ErrorAlert>
          ) : null}

          <Field className="gap-2">
            <FieldLabel htmlFor="refund-amount">Amount</FieldLabel>
            <Input
              id="refund-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={totalAmount}
            />
          </Field>
          <p className="text-muted-foreground text-sm">
            Full refund releases seats · Partial keeps the booking
          </p>

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

          {requireSafeguard ? (
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="refund-confirm"
                checked={confirmed}
                onCheckedChange={(c) => setConfirmed(c === true)}
                className="mt-0.5"
              />
              <FieldLabel
                htmlFor="refund-confirm"
                className="text-sm font-normal"
              >
                I confirm this proactive refund is intentional.
              </FieldLabel>
            </div>
          ) : null}

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              Keep booking
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirm}
              disabled={pending || (requireSafeguard && !confirmed)}
            >
              {pending ? 'Refunding…' : 'Refund now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default RefundBooking;
