'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2Icon } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { BookingDto } from '../../lib/api/booking';
import { cancelBookingAction, payNowAction } from '../../lib/booking/actions';
import { buildCancellationRequestPayload } from '../../lib/booking/cancel-request';
import { formatTripDate } from '../../lib/booking/my-bookings';
import { submitEnquiry } from '../../lib/api/enquiry';

type RequestStatus = 'idle' | 'sending' | 'sent' | 'error';

/** Status-aware actions on the booking detail: pay/cancel a PENDING booking, or request cancellation
 * of a PAID one (refunds are admin-only → the request lands in the team's enquiry CRM). */
export function BookingActions({ booking }: { booking: BookingDto }) {
  const t = messages.booking.detail;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [reason, setReason] = useState('');
  const [reqStatus, setReqStatus] = useState<RequestStatus>('idle');

  async function payNow() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const res = await payNowAction(booking.code); // redirects on success
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  async function confirmCancel() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const res = await cancelBookingAction(booking.code);
    if (res.ok) {
      setCancelOpen(false);
      router.refresh(); // re-fetch → status flips to CANCELLED → these actions disappear
    } else {
      setError(res.error);
      setPending(false);
    }
  }

  async function sendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reqStatus === 'sending') return;
    setReqStatus('sending');
    const payload = buildCancellationRequestPayload({
      code: booking.code,
      tourTitle: booking.tour.title,
      departureDate: formatTripDate(booking.departure.startDate),
      name: booking.contactName,
      email: booking.contactEmail,
      reason,
    });
    const result = await submitEnquiry(payload);
    setReqStatus(result.ok ? 'sent' : 'error');
  }

  if (booking.status === 'PENDING') {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => void payNow()} disabled={pending} className="sm:flex-1">
            {t.payNow}
          </Button>
          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="lg"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                />
              }
            >
              {t.cancel}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t.cancelConfirmTitle}</DialogTitle>
                <DialogDescription>{t.cancelConfirmBody}</DialogDescription>
              </DialogHeader>
              {error ? (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={pending}>
                  {t.keep}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmCancel()}
                  disabled={pending}
                >
                  {pending ? t.cancelling : t.cancelConfirmCta}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {error && !cancelOpen ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (booking.status === 'PAID') {
    if (reqStatus === 'sent') {
      return (
        <p className="text-success flex items-center gap-2 text-sm font-medium" role="status">
          <CheckCircle2Icon className="size-4" />
          {t.requestSent}
        </p>
      );
    }
    return (
      <div className="border-border space-y-3 rounded-xl border border-dashed p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t.requestTitle}</h3>
          <p className="text-muted-foreground text-sm text-pretty">{t.requestBody}</p>
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
            {reqStatus === 'error' ? (
              <p className="text-destructive text-sm" role="alert">
                {t.requestError}
              </p>
            ) : null}
            <Button type="submit" disabled={reqStatus === 'sending'}>
              {reqStatus === 'sending' ? t.submitting : t.submitRequest}
            </Button>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setRequesting(true)}>
            {t.requestCta}
          </Button>
        )}
        <Link href="/cancellation-policy" className="text-muted-foreground inline-block text-xs hover:underline">
          {t.policyLink}
        </Link>
      </div>
    );
  }

  return null; // CANCELLED / REFUNDED — read-only
}

export default BookingActions;
