'use client';

import { useActionState, useMemo, useState } from 'react';

import {
  Button,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Switch,
  Textarea,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { DepartureOption } from '../../lib/api/booking';
import {
  createAndCheckout,
  type BookingActionState,
} from '../../lib/booking/actions';
import { computeBookingTotal } from '../../lib/booking/price';
import { FieldErrorText } from '../forms/field-error-text';
import { DeparturePicker } from './departure-picker';
import { OrderSummary } from './order-summary';
import { PrivateRequestForm } from './private-request-form';

type Provider = 'STRIPE' | 'PAYPAL';
export type BookingMode = 'scheduled' | 'private';

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
  tourId,
  currency,
  departures,
  durationDays,
  initialDepartureId,
  initialMode = 'scheduled',
  defaultName,
  defaultEmail,
  defaultPhone,
}: {
  tourSlug: string;
  tourTitle: string;
  tourId: string;
  currency: string;
  departures: DepartureOption[];
  durationDays: number;
  initialDepartureId: string;
  initialMode?: BookingMode;
  // Pre-filled (but editable) from the signed-in user's profile — they may book for someone else.
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}) {
  const t = messages.booking.form;
  const noDepartures = departures.length === 0;
  const [mode, setMode] = useState<BookingMode>(
    noDepartures ? 'private' : initialMode,
  );
  const [state, formAction, pending] = useActionState<
    BookingActionState,
    FormData
  >(createAndCheckout, {});
  // Server-validated per-field codes from `createAndCheckout` (empty until a submit comes back).
  const fieldErrors = state.fieldErrors ?? {};

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
    <div className="space-y-6">
      {/* Mode toggle: scheduled (pay now) ⟷ private (request a quote) */}
      <div className="bg-muted/40 flex items-center justify-between gap-4 rounded-xl border p-4">
        <div>
          <p className="font-medium">{t.modeToggle.label}</p>
          <p
            id="booking-mode-hint"
            className="text-muted-foreground text-sm text-pretty"
          >
            {noDepartures ? t.modeToggle.noDepartures : t.modeToggle.hint}
          </p>
        </div>
        <Switch
          checked={mode === 'private'}
          onCheckedChange={(v) => setMode(v ? 'private' : 'scheduled')}
          disabled={noDepartures}
          aria-label={t.modeToggle.label}
          aria-describedby="booking-mode-hint"
        />
      </div>

      {mode === 'private' ? (
        <PrivateRequestForm
          tourId={tourId}
          tourTitle={tourTitle}
          durationDays={durationDays}
          defaultName={defaultName}
          defaultEmail={defaultEmail}
          defaultPhone={defaultPhone}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <form action={formAction} noValidate className="space-y-6">
            {/* Values from the presentational widgets, posted as plain fields. */}
            <input type="hidden" name="tourSlug" value={tourSlug} />
            <input type="hidden" name="departureId" value={departureId} />
            <input type="hidden" name="paymentProvider" value={provider} />

            {/* ① Your trip — dates + party */}
            <FieldSet className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-3">
              <div>
                <FieldLegend className="font-heading text-base font-semibold">
                  {t.datesHeading}
                </FieldLegend>
                <FieldDescription>{t.datesDesc}</FieldDescription>
              </div>
              <FieldGroup className="grid grid-cols-1 gap-4 md:col-span-2">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="departure">{t.departure}</FieldLabel>
                  <DeparturePicker
                    departures={departures}
                    value={departureId}
                    onChange={setDepartureId}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="numAdults">{t.adults}</FieldLabel>
                    <Input
                      id="numAdults"
                      name="numAdults"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_ADULTS}
                      value={adults}
                      onChange={(e) =>
                        setAdults(
                          clampInt(e.target.valueAsNumber, 1, MAX_ADULTS),
                        )
                      }
                      aria-required="true"
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="numChildren">{t.children}</FieldLabel>
                    <Input
                      id="numChildren"
                      name="numChildren"
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
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.contactName)}
                    aria-describedby={
                      fieldErrors.contactName ? 'contactName-error' : undefined
                    }
                  />
                  <FieldErrorText
                    id="contactName-error"
                    field="contactName"
                    code={fieldErrors.contactName}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="contactEmail">
                      {t.contactEmail}
                    </FieldLabel>
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      autoComplete="email"
                      defaultValue={defaultEmail}
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.contactEmail)}
                      aria-describedby={
                        fieldErrors.contactEmail
                          ? 'contactEmail-error'
                          : undefined
                      }
                    />
                    <FieldErrorText
                      id="contactEmail-error"
                      field="contactEmail"
                      code={fieldErrors.contactEmail}
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="contactPhone">
                      {t.contactPhone}
                    </FieldLabel>
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      autoComplete="tel"
                      defaultValue={defaultPhone}
                    />
                  </Field>
                </div>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="specialRequests">
                    {t.specialRequests}
                  </FieldLabel>
                  <Textarea
                    id="specialRequests"
                    name="specialRequests"
                    rows={3}
                    placeholder={t.specialRequestsPlaceholder}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            <Separator />

            {/* ③ Payment */}
            <FieldSet className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-3">
              <div>
                <FieldLegend className="font-heading text-base font-semibold">
                  {t.paymentHeading}
                </FieldLegend>
                <FieldDescription>{t.paymentDesc}</FieldDescription>
              </div>
              <RadioGroup
                value={provider}
                onValueChange={(v) => setProvider(v as Provider)}
                className="gap-3 md:col-span-2"
              >
                <Label
                  htmlFor="pay-stripe"
                  className="hover:border-primary/60 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-data-checked:border-primary has-data-checked:bg-primary/5"
                >
                  <RadioGroupItem
                    id="pay-stripe"
                    value="STRIPE"
                    className="mt-0.5"
                  />
                  <span className="space-y-0.5">
                    <span className="block font-medium">{t.stripe}</span>
                    <span className="text-muted-foreground block text-sm">
                      {t.stripeHint}
                    </span>
                  </span>
                </Label>
                <Label
                  htmlFor="pay-paypal"
                  className="hover:border-primary/60 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-data-checked:border-primary has-data-checked:bg-primary/5"
                >
                  <RadioGroupItem
                    id="pay-paypal"
                    value="PAYPAL"
                    className="mt-0.5"
                  />
                  <span className="space-y-0.5">
                    <span className="block font-medium">{t.paypal}</span>
                    <span className="text-muted-foreground block text-sm">
                      {t.paypalHint}
                    </span>
                  </span>
                </Label>
              </RadioGroup>
            </FieldSet>

            {state.error ? (
              <p
                id="booking-error"
                className="text-destructive text-sm"
                role="alert"
              >
                {state.error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending || !departureId}
              aria-describedby={state.error ? 'booking-error' : undefined}
            >
              {pending ? t.submitting : t.submit}
            </Button>
            <p className="text-muted-foreground text-center text-xs text-pretty">
              {t.trustLine}
            </p>
          </form>

          <OrderSummary
            tourTitle={tourTitle}
            departureLabel={selected?.label ?? null}
            lines={lines}
            total={total}
            currency={currency}
          />
        </div>
      )}
    </div>
  );
}

export default BookingForm;
