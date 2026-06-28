'use client';

import { useState } from 'react';
import { CheckIcon } from 'lucide-react';

import {
  Button,
  cn,
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { buildPlanTripPayload, isValidEnquiry } from '../../lib/enquiry-form';
import { submitEnquiry } from '../../lib/api/enquiry';
import { DatePicker } from '../booking/date-picker';
import { EnquiryStatus, EnquirySuccess, type EnquiryFormStatus } from './enquiry-status';

// Pill-style choice chips, built on the design-system ToggleGroup (keeps the primary-filled look
// while gaining real toggle semantics + keyboard support over the old native buttons).
const chipItem = cn(
  'rounded-full border border-border bg-background px-3.5 text-sm font-medium text-muted-foreground',
  'hover:border-foreground/30 hover:bg-background hover:text-foreground',
  'aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground',
  'aria-pressed:hover:border-primary aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground',
);

function ChoiceChips({
  legend,
  options,
  value,
  multiple,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  value: string[];
  multiple?: boolean;
  onChange: (value: string[]) => void;
}) {
  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label">{legend}</FieldLegend>
      <ToggleGroup
        multiple={multiple}
        value={value}
        onValueChange={(next) => onChange(next as string[])}
        className="w-full flex-wrap"
      >
        {options.map((opt) => (
          <ToggleGroupItem key={opt} value={opt} className={chipItem}>
            {opt}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldSet>
  );
}

/**
 * Rich "Plan your trip" enquiry form — maps the Enquiry model (name · email · phone · nationality ·
 * travelDate · groupSize · budgetTier · interests · message). Single-select chips for
 * duration/budget, multi-select for interests. Built entirely on `@tourism/ui` primitives.
 */
export function PlanTripForm() {
  const t = messages.planTrip;
  const f = t.fields;
  const [duration, setDuration] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [travelDate, setTravelDate] = useState('');
  const [status, setStatus] = useState<EnquiryFormStatus>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = buildPlanTripPayload({
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      nationality: String(fd.get('nationality') ?? ''),
      travelDate,
      groupSize: String(fd.get('groupSize') ?? ''),
      message: String(fd.get('message') ?? ''),
      duration,
      budget,
      interests,
      website: String(fd.get('website') ?? ''),
    });
    if (!isValidEnquiry(payload)) {
      setStatus('invalid');
      return;
    }
    setStatus('submitting');
    const res = await submitEnquiry(payload);
    setStatus(res.ok ? 'success' : res.rateLimited ? 'rateLimited' : 'error');
  }

  return (
    <section id="contact" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="shadow-card grid overflow-hidden rounded-2xl lg:grid-cols-5">
          {/* Copy */}
          <div className="bg-primary text-primary-foreground flex flex-col justify-center gap-6 p-8 sm:p-12 lg:col-span-2">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
                {t.heading}
              </h2>
              <p className="text-primary-foreground/85 text-lg text-pretty">{t.subtitle}</p>
            </div>
            <ul className="space-y-3">
              {t.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="bg-primary-foreground/15 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                    <CheckIcon className="size-3.5" />
                  </span>
                  <span className="text-primary-foreground/90 text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form */}
          <div className="bg-card p-8 sm:p-12 lg:col-span-3">
            {status === 'success' ? (
              <EnquirySuccess />
            ) : (
              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                {/* Honeypot — hidden from real users; the API drops non-empty submissions. */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-name">{f.name}</FieldLabel>
                    <Input id="pt-name" name="name" type="text" placeholder={f.namePlaceholder} />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-email">{f.email}</FieldLabel>
                    <Input
                      id="pt-email"
                      name="email"
                      type="email"
                      placeholder={f.emailPlaceholder}
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-phone">{f.phone}</FieldLabel>
                    <Input id="pt-phone" name="phone" type="tel" placeholder={f.phonePlaceholder} />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-nationality">{f.nationality}</FieldLabel>
                    <Input
                      id="pt-nationality"
                      name="nationality"
                      type="text"
                      placeholder={f.nationalityPlaceholder}
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-date">{f.travelDate}</FieldLabel>
                    <DatePicker id="pt-date" value={travelDate} onChange={setTravelDate} />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-travellers">{f.travellers}</FieldLabel>
                    <Input
                      id="pt-travellers"
                      name="groupSize"
                      type="number"
                      min={1}
                      placeholder={f.travellersPlaceholder}
                    />
                  </Field>
                </div>

                <ChoiceChips
                  legend={t.durationLabel}
                  options={t.duration}
                  value={duration ? [duration] : []}
                  onChange={(v) => setDuration(v[0] ?? null)}
                />
                <ChoiceChips
                  legend={t.budgetLabel}
                  options={t.budget}
                  value={budget ? [budget] : []}
                  onChange={(v) => setBudget(v[0] ?? null)}
                />
                <ChoiceChips
                  legend={t.interestsLabel}
                  options={t.interests}
                  value={interests}
                  multiple
                  onChange={setInterests}
                />

                <Field className="gap-1.5">
                  <FieldLabel htmlFor="pt-message">{f.message}</FieldLabel>
                  <Textarea
                    id="pt-message"
                    name="message"
                    rows={3}
                    placeholder={f.messagePlaceholder}
                  />
                </Field>

                <EnquiryStatus status={status} />
                <Button type="submit" size="lg" disabled={status === 'submitting'} className="mt-1 w-full">
                  {status === 'submitting' ? messages.enquiryForm.submitting : t.submit}
                </Button>
                <p className="text-muted-foreground text-xs">{t.note}</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PlanTripForm;
