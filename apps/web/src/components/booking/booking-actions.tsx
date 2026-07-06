'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Textarea,
  toast,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { BookingDto } from '../../lib/api/booking';
import { cancelBookingAction, payNowAction, requestCancellationAction } from '../../lib/booking/actions';
import { formatPrice } from './order-summary';

/** Status-aware actions on the booking detail: pay/cancel a PENDING booking, request cancellation of a
 * PAID one against the real cancellation-request record, and surface the terminal refund state. */
export function BookingActions({ booking }: { booking: BookingDto }) {
  const t = messages.booking.detail;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function payNow() {
    if (pending) return;
    setPending(true);
    const res = await payNowAction(booking.code); // redirects on success
    if (res?.error) {
      toast.error(res.error);
      setPending(false);
    }
  }

  async function confirmCancel() {
    if (pending) return;
    setPending(true);
    const res = await cancelBookingAction(booking.code);
    if (res.ok) {
      setCancelOpen(false);
      toast.success(t.cancelled);
      router.refresh(); // re-fetch → status flips to CANCELLED → these actions disappear
    } else {
      setPending(false);
      toast.error(res.error);
    }
  }

  async function sendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const result = await requestCancellationAction(booking.code, reason);
    if (result.ok) {
      toast.success(t.requestToast);
      router.refresh(); // re-fetch → cancellationRequest.status flips to REQUESTED
    } else {
      setSubmitting(false);
      toast.error(result.error ?? t.requestError);
    }
  }

  if (booking.status === 'PENDING') {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => void payNow()} disabled={pending} className="sm:flex-1">
            {t.payNow}
          </Button>
          <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <AlertDialogTrigger
              render={
                <Button
                  variant="outline"
                  size="lg"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                />
              }
            >
              {t.cancel}
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>{t.cancelConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.cancelConfirmBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>{t.keep}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => void confirmCancel()}
                  disabled={pending}
                >
                  {pending ? t.cancelling : t.cancelConfirmCta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  if (booking.status === 'PAID') {
    const requestStatus = booking.cancellationRequest?.status;
    if (requestStatus === 'REQUESTED') {
      return (
        <p className="text-muted-foreground text-sm font-medium" role="status">
          {t.requestPending}
        </p>
      );
    }
    const isDenied = requestStatus === 'DENIED';
    return (
      <div className="border-border space-y-3 rounded-xl border border-dashed p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t.requestTitle}</h3>
          <p className="text-muted-foreground text-sm text-pretty">{t.requestBody}</p>
          {isDenied ? (
            <p className="text-destructive text-sm" role="alert">
              {t.requestDenied}
            </p>
          ) : null}
        </div>
        {requesting ? (
          <form onSubmit={sendRequest} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="cancel-reason" className="text-sm font-medium">
                {t.reasonLabel}
              </label>
              <Textarea
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={t.reasonPlaceholder}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? t.submitting : isDenied ? t.requestResubmit : t.submitRequest}
            </Button>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setRequesting(true)}>
            {isDenied ? t.requestResubmit : t.requestCta}
          </Button>
        )}
        <Link href="/cancellation-policy" className="text-muted-foreground inline-block text-xs hover:underline">
          {t.policyLink}
        </Link>
      </div>
    );
  }

  if (booking.refundedAmount) {
    const amount = formatPrice(booking.currency, Number(booking.refundedAmount));
    return (
      <p className="text-muted-foreground text-sm" role="status">
        {booking.status === 'PARTIALLY_REFUNDED' ? t.partiallyRefundedNote(amount) : t.refundedNote(amount)}
      </p>
    );
  }

  return null; // CANCELLED (no refund) — read-only
}

export default BookingActions;
