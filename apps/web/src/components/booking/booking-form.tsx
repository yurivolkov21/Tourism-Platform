'use client';

import { useActionState, useMemo, useState } from 'react';

import {
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Textarea,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { DepartureOption } from '../../lib/api/booking';
import { createAndCheckout, type BookingActionState } from '../../lib/booking/actions';
import { computeBookingTotal } from '../../lib/booking/price';
import { DeparturePicker } from './departure-picker';
import { OrderSummary } from './order-summary';

type Provider = 'STRIPE' | 'PAYPAL';

const MAX_ADULTS = 20;
const MAX_CHILDREN = 20;

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * The booking form (client). Owns party size / departure / gateway state to drive the live order
 * summary, and submits to the `createAndCheckout` server action via `useActionState`. The Base UI
 * Select + RadioGroup are presentational; their values post through hidden inputs so the action reads
 * a plain `FormData` (party sizes use native number inputs that post directly).
 */
export function BookingForm({
  tourSlug,
  tourTitle,
  currency,
  departures,
  initialDepartureId,
  defaultEmail,
}: {
  tourSlug: string;
  tourTitle: string;
  currency: string;
  departures: DepartureOption[];
  initialDepartureId: string;
  defaultEmail?: string;
}) {
  const t = messages.booking.form;
  const [state, formAction, pending] = useActionState<BookingActionState, FormData>(
    createAndCheckout,
    {},
  );

  const [departureId, setDepartureId] = useState(initialDepartureId);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [provider, setProvider] = useState<Provider>('STRIPE');

  const selected = useMemo(
    () => departures.find((d) => d.id === departureId),
    [departures, departureId],
  );
  const unitPrice = selected?.price ?? 0;
  const { total, lines } = useMemo(
    () => computeBookingTotal(unitPrice, adults, children),
    [unitPrice, adults, children],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <form action={formAction} className="space-y-6">
        {/* Values from the presentational widgets, posted as plain fields. */}
        <input type="hidden" name="tourSlug" value={tourSlug} />
        <input type="hidden" name="departureId" value={departureId} />
        <input type="hidden" name="paymentProvider" value={provider} />

        <fieldset className="space-y-4">
          <legend className="font-heading text-lg font-semibold">{t.heading}</legend>

          <div className="space-y-1.5">
            <Label htmlFor="departure">{t.departure}</Label>
            <DeparturePicker
              departures={departures}
              value={departureId}
              onChange={setDepartureId}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="numAdults">{t.adults}</Label>
              <Input
                id="numAdults"
                name="numAdults"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_ADULTS}
                value={adults}
                onChange={(e) => setAdults(clampInt(e.target.valueAsNumber, 1, MAX_ADULTS))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numChildren">{t.children}</Label>
              <Input
                id="numChildren"
                name="numChildren"
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_CHILDREN}
                value={children}
                onChange={(e) => setChildren(clampInt(e.target.valueAsNumber, 0, MAX_CHILDREN))}
              />
            </div>
          </div>
        </fieldset>

        <Separator />

        <fieldset className="space-y-4">
          <legend className="font-heading text-lg font-semibold">{messages.booking.page.partyLabel}</legend>

          <div className="space-y-1.5">
            <Label htmlFor="contactName">{t.contactName}</Label>
            <Input id="contactName" name="contactName" autoComplete="name" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">{t.contactEmail}</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                autoComplete="email"
                defaultValue={defaultEmail}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">{t.contactPhone}</Label>
              <Input id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="specialRequests">{t.specialRequests}</Label>
            <Textarea
              id="specialRequests"
              name="specialRequests"
              rows={3}
              placeholder={t.specialRequestsPlaceholder}
            />
          </div>
        </fieldset>

        <Separator />

        <fieldset className="space-y-3">
          <legend className="font-heading text-lg font-semibold">{t.paymentHeading}</legend>
          <RadioGroup
            value={provider}
            onValueChange={(v) => setProvider(v as Provider)}
            className="gap-3"
          >
            <Label
              htmlFor="pay-stripe"
              className="hover:border-primary/60 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
            >
              <RadioGroupItem id="pay-stripe" value="STRIPE" className="mt-0.5" />
              <span className="space-y-0.5">
                <span className="block font-medium">{t.stripe}</span>
                <span className="text-muted-foreground block text-sm">{t.stripeHint}</span>
              </span>
            </Label>
            <Label
              htmlFor="pay-paypal"
              className="hover:border-primary/60 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
            >
              <RadioGroupItem id="pay-paypal" value="PAYPAL" className="mt-0.5" />
              <span className="space-y-0.5">
                <span className="block font-medium">{t.paypal}</span>
                <span className="text-muted-foreground block text-sm">{t.paypalHint}</span>
              </span>
            </Label>
          </RadioGroup>
        </fieldset>

        {state.error ? (
          <p className="text-destructive text-sm" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending || !departureId}>
          {pending ? t.submitting : t.submit}
        </Button>
        <p className="text-muted-foreground text-center text-xs text-pretty">{t.trustLine}</p>
      </form>

      <OrderSummary
        tourTitle={tourTitle}
        departureLabel={selected?.label ?? null}
        lines={lines}
        total={total}
        currency={currency}
      />
    </div>
  );
}

export default BookingForm;
