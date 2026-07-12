'use client';

import { useState } from 'react';
import { CheckIcon } from 'lucide-react';

import { Button, Field, FieldLabel, Input, Textarea, toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { buildPlanTripPayload } from '../../lib/enquiry-form';
import { submitEnquiry } from '../../lib/api/enquiry';
import { LEAD_FIELD_CLASS, LEAD_TEXTAREA_CLASS } from '../../lib/form-field';
import {
  validateEnquiryFields,
  type EnquiryFieldErrors,
} from '../../lib/forms/validate';
import { DatePicker } from '../booking/date-picker';
import { FieldErrorText } from '../forms/field-error-text';
import { ChoiceChips } from './choice-chips';
import { EnquirySuccess, type EnquiryFormStatus } from './enquiry-status';

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
  const [fieldErrors, setFieldErrors] = useState<EnquiryFieldErrors>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') ?? '');
    const email = String(fd.get('email') ?? '');

    const invalid = validateEnquiryFields({ name, email });
    setFieldErrors(invalid);
    if (Object.keys(invalid).length > 0) return;

    const payload = buildPlanTripPayload({
      name,
      email,
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
    setStatus('submitting');
    const res = await submitEnquiry(payload);
    if (res.ok) {
      setStatus('success');
    } else {
      toast.error(
        res.rateLimited
          ? messages.enquiryForm.rateLimited
          : messages.enquiryForm.errorGeneric,
      );
      setStatus('idle');
    }
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
              <p className="text-primary-foreground/85 text-lg text-pretty">
                {t.subtitle}
              </p>
            </div>
            <ul className="space-y-3">
              {t.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="bg-primary-foreground/15 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                    <CheckIcon className="size-3.5" />
                  </span>
                  <span className="text-primary-foreground/90 text-sm">
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form */}
          <div className="bg-card p-8 sm:p-12 lg:col-span-3">
            {status === 'success' ? (
              <EnquirySuccess />
            ) : (
              <form
                className="flex flex-col gap-5"
                onSubmit={handleSubmit}
                noValidate
              >
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
                    <Input
                      id="pt-name"
                      name="name"
                      type="text"
                      placeholder={f.namePlaceholder}
                      className={LEAD_FIELD_CLASS}
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={
                        fieldErrors.name ? 'pt-name-error' : undefined
                      }
                    />
                    <FieldErrorText
                      id="pt-name-error"
                      field="name"
                      code={fieldErrors.name}
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-email">{f.email}</FieldLabel>
                    <Input
                      id="pt-email"
                      name="email"
                      type="email"
                      placeholder={f.emailPlaceholder}
                      className={LEAD_FIELD_CLASS}
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={
                        fieldErrors.email ? 'pt-email-error' : undefined
                      }
                    />
                    <FieldErrorText
                      id="pt-email-error"
                      field="email"
                      code={fieldErrors.email}
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-phone">{f.phone}</FieldLabel>
                    <Input
                      id="pt-phone"
                      name="phone"
                      type="tel"
                      placeholder={f.phonePlaceholder}
                      className={LEAD_FIELD_CLASS}
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-nationality">
                      {f.nationality}
                    </FieldLabel>
                    <Input
                      id="pt-nationality"
                      name="nationality"
                      type="text"
                      placeholder={f.nationalityPlaceholder}
                      className={LEAD_FIELD_CLASS}
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-date">{f.travelDate}</FieldLabel>
                    <DatePicker
                      id="pt-date"
                      value={travelDate}
                      onChange={setTravelDate}
                      className={LEAD_FIELD_CLASS}
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pt-travellers">
                      {f.travellers}
                    </FieldLabel>
                    <Input
                      id="pt-travellers"
                      name="groupSize"
                      type="number"
                      min={1}
                      placeholder={f.travellersPlaceholder}
                      className={LEAD_FIELD_CLASS}
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
                    className={LEAD_TEXTAREA_CLASS}
                  />
                </Field>

                <Button
                  type="submit"
                  size="lg"
                  disabled={status === 'submitting'}
                  className="mt-1 w-full"
                >
                  {status === 'submitting'
                    ? messages.enquiryForm.submitting
                    : t.submit}
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
