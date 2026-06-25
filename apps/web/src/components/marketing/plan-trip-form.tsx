'use client';

import { useState } from 'react';
import { CheckIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { buildPlanTripPayload, isValidEnquiry } from '../../lib/enquiry-form';
import { submitEnquiry } from '../../lib/api/enquiry';
import { EnquiryStatus, EnquirySuccess, type EnquiryFormStatus } from './enquiry-status';

const inputClass =
  'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 h-11 w-full rounded-md border px-3 text-sm outline-none transition-[box-shadow] focus-visible:ring-2';

const chipBase =
  'rounded-full border px-3.5 py-1.5 text-sm transition-colors cursor-pointer';
const chipOn = 'border-primary bg-primary text-primary-foreground';
const chipOff = 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground';

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Rich "Plan your trip" enquiry form — maps the Enquiry model (name · email · phone · nationality ·
 * travelDate · groupSize · budgetTier · interests · message). UI-first: submission is wired to the
 * typed client later. Single-select chips for duration/budget, multi-select for interests.
 */
export function PlanTripForm() {
  const t = messages.planTrip;
  const f = t.fields;
  const [duration, setDuration] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [status, setStatus] = useState<EnquiryFormStatus>('idle');

  const toggleInterest = (value: string) =>
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = buildPlanTripPayload({
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      nationality: String(fd.get('nationality') ?? ''),
      travelDate: String(fd.get('travelDate') ?? ''),
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
                <Field id="pt-name" label={f.name}>
                  <input id="pt-name" name="name" type="text" placeholder={f.namePlaceholder} className={inputClass} />
                </Field>
                <Field id="pt-email" label={f.email}>
                  <input id="pt-email" name="email" type="email" placeholder={f.emailPlaceholder} className={inputClass} />
                </Field>
                <Field id="pt-phone" label={f.phone}>
                  <input id="pt-phone" name="phone" type="tel" placeholder={f.phonePlaceholder} className={inputClass} />
                </Field>
                <Field id="pt-nationality" label={f.nationality}>
                  <input id="pt-nationality" name="nationality" type="text" placeholder={f.nationalityPlaceholder} className={inputClass} />
                </Field>
                <Field id="pt-date" label={f.travelDate}>
                  <input id="pt-date" name="travelDate" type="date" className={inputClass} />
                </Field>
                <Field id="pt-travellers" label={f.travellers}>
                  <input id="pt-travellers" name="groupSize" type="number" min={1} placeholder={f.travellersPlaceholder} className={inputClass} />
                </Field>
              </div>

              {/* Duration (single-select) */}
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">{t.durationLabel}</legend>
                <div className="flex flex-wrap gap-2">
                  {t.duration.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration((cur) => (cur === d ? null : d))}
                      className={cn(chipBase, duration === d ? chipOn : chipOff)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Budget (single-select) */}
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">{t.budgetLabel}</legend>
                <div className="flex flex-wrap gap-2">
                  {t.budget.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBudget((cur) => (cur === b ? null : b))}
                      className={cn(chipBase, budget === b ? chipOn : chipOff)}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Interests (multi-select) */}
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">{t.interestsLabel}</legend>
                <div className="flex flex-wrap gap-2">
                  {t.interests.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleInterest(i)}
                      className={cn(chipBase, interests.includes(i) ? chipOn : chipOff)}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </fieldset>

              <Field id="pt-message" label={f.message}>
                <textarea
                  id="pt-message"
                  name="message"
                  rows={3}
                  placeholder={f.messagePlaceholder}
                  className={cn(inputClass, 'h-auto py-2.5')}
                />
              </Field>

              <EnquiryStatus status={status} />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className={cn(buttonVariants({ size: 'lg' }), 'mt-1 w-full disabled:opacity-70')}
              >
                {status === 'submitting' ? messages.enquiryForm.submitting : t.submit}
              </button>
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
