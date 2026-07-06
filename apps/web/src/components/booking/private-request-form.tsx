'use client';

import { useState, type FormEvent } from 'react';
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  SparklesIcon,
} from 'lucide-react';

import {
  Button,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  Separator,
  Textarea,
  toast,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { submitEnquiry } from '../../lib/api/enquiry';
import {
  buildPrivateEnquiryPayload,
  deriveEndDate,
} from '../../lib/booking/private-request';
import { formatTripDate } from '../../lib/booking/my-bookings';
import { DatePicker } from './date-picker';

const MAX_ADULTS = 20;
const MAX_CHILDREN = 20;

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * Mode B of the booking page — a quote-based **private departure** request. Collects a preferred
 * start date (any date), party size, and traveller details, then submits an `Enquiry` (no payment).
 * Kept entirely separate from the scheduled booking/payment flow.
 */
export function PrivateRequestForm({
  tourId,
  tourTitle,
  durationDays,
  defaultName,
  defaultEmail,
  defaultPhone,
}: {
  tourId: string;
  tourTitle: string;
  durationDays: number;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}) {
  const t = messages.booking.form;
  const tp = t.private;

  const [startDate, setStartDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const endDate = startDate ? deriveEndDate(startDate, durationDays) : '';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !startDate) return;
    const fd = new FormData(event.currentTarget);
    setPending(true);

    const payload = buildPrivateEnquiryPayload({
      tourId,
      tourTitle,
      durationDays,
      startDate,
      name: String(fd.get('contactName') ?? ''),
      email: String(fd.get('contactEmail') ?? ''),
      phone: String(fd.get('contactPhone') ?? ''),
      adults,
      children,
      requests: String(fd.get('requests') ?? ''),
    });

    const result = await submitEnquiry(payload);
    if (result.ok) {
      setDone(true);
    } else {
      toast.error(result.rateLimited ? tp.rateLimited : tp.error);
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="bg-card shadow-card flex flex-col items-center gap-3 rounded-2xl border px-6 py-16 text-center">
        <span className="bg-success/10 text-success flex size-14 items-center justify-center rounded-full">
          <CheckCircle2Icon className="size-7" />
        </span>
        <h2 className="font-heading text-2xl font-semibold">
          {tp.successTitle}
        </h2>
        <p className="text-muted-foreground max-w-md text-pretty">
          {tp.successBody}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <form onSubmit={onSubmit} className="space-y-6">
        {/* ① Your dates */}
        <FieldSet className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-3">
          <div>
            <FieldLegend className="font-heading text-base font-semibold">
              {tp.datesHeading}
            </FieldLegend>
            <FieldDescription>{tp.datesDesc}</FieldDescription>
          </div>
          <FieldGroup className="grid grid-cols-1 gap-4 md:col-span-2">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="startDate">{tp.startDate}</FieldLabel>
              <DatePicker
                id="startDate"
                value={startDate}
                onChange={setStartDate}
              />
              {endDate ? (
                <FieldDescription>
                  {tp.endHint(formatTripDate(endDate), durationDays)}
                </FieldDescription>
              ) : null}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="numAdults">{t.adults}</FieldLabel>
                <Input
                  id="numAdults"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_ADULTS}
                  value={adults}
                  onChange={(e) =>
                    setAdults(clampInt(e.target.valueAsNumber, 1, MAX_ADULTS))
                  }
                  required
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="numChildren">{t.children}</FieldLabel>
                <Input
                  id="numChildren"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_CHILDREN}
                  value={children}
                  onChange={(e) =>
                    setChildren(
                      clampInt(e.target.valueAsNumber, 0, MAX_CHILDREN),
                    )
                  }
                />
              </Field>
            </div>
          </FieldGroup>
        </FieldSet>

        <Separator />

        {/* ② Traveller details */}
        <FieldSet className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-3">
          <div>
            <FieldLegend className="font-heading text-base font-semibold">
              {t.travellersHeading}
            </FieldLegend>
            <FieldDescription>{t.travellersDesc}</FieldDescription>
          </div>
          <FieldGroup className="grid grid-cols-1 gap-4 md:col-span-2">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="contactName">{t.contactName}</FieldLabel>
              <Input
                id="contactName"
                name="contactName"
                autoComplete="name"
                defaultValue={defaultName}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="contactEmail">{t.contactEmail}</FieldLabel>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  autoComplete="email"
                  defaultValue={defaultEmail}
                  required
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="contactPhone">{t.contactPhone}</FieldLabel>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  autoComplete="tel"
                  defaultValue={defaultPhone}
                />
              </Field>
            </div>
          </FieldGroup>
        </FieldSet>

        <Separator />

        {/* ③ Trip preferences */}
        <FieldSet className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-3">
          <div>
            <FieldLegend className="font-heading text-base font-semibold">
              {tp.preferencesHeading}
            </FieldLegend>
            <FieldDescription>{tp.preferencesDesc}</FieldDescription>
          </div>
          <FieldGroup className="md:col-span-2">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="requests">{tp.requests}</FieldLabel>
              <Textarea
                id="requests"
                name="requests"
                rows={4}
                placeholder={tp.requestsPlaceholder}
              />
            </Field>
          </FieldGroup>
        </FieldSet>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || !startDate}
        >
          {pending ? tp.submitting : tp.submit}
        </Button>
        <p className="text-muted-foreground text-center text-xs text-pretty">
          {tp.confirmNote}
        </p>
      </form>

      {/* Private-request summary (replaces the price/total summary) */}
      <aside className="bg-card shadow-card h-fit rounded-2xl border p-6 lg:sticky lg:top-24">
        <h2 className="font-heading text-lg font-semibold">
          {tp.summaryHeading}
        </h2>
        <p className="text-muted-foreground mt-1 text-xs font-semibold tracking-wide uppercase">
          {messages.booking.page.departureLabel}
        </p>
        <p className="mt-1 font-medium text-pretty">{tourTitle}</p>
        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
          <CalendarClockIcon className="size-4" />
          {startDate
            ? `${formatTripDate(startDate)} → ${formatTripDate(endDate)}`
            : tp.startDate}
        </p>
        <Separator className="my-4" />
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <SparklesIcon className="text-primary size-4" />
          {tp.priceOnRequest}
        </p>
        <p className="text-muted-foreground mt-1 text-xs text-pretty">
          {tp.confirmNote}
        </p>
      </aside>
    </div>
  );
}

export default PrivateRequestForm;
