'use client';

import { useState } from 'react';
import { CheckIcon } from 'lucide-react';

import { Button, Field, FieldLabel, Input, toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { buildEnquiryCtaPayload } from '../../lib/enquiry-form';
import { submitEnquiry } from '../../lib/api/enquiry';
import { LEAD_FIELD_CLASS } from '../../lib/form-field';
import {
  validateEnquiryFields,
  type EnquiryFieldErrors,
} from '../../lib/forms/validate';
import { FieldErrorText } from '../forms/field-error-text';
import { EnquirySuccess, type EnquiryFormStatus } from './enquiry-status';

interface EnquiryCtaProps {
  /** Anchor id — kept as `contact` so in-page "Request to book" CTAs can scroll here. */
  id?: string;
  /** Contextual heading override (tour-aware / region-aware). Falls back to the generic copy. */
  heading?: string;
  /** Contextual subtitle override. Falls back to the generic copy. */
  subtitle?: string;
  /** Pre-fills the destination field (e.g. the tour or region the visitor is viewing). */
  prefillDestination?: string;
}

// Lead-capture split: benefits-led copy on emerald, a compact enquiry form on a card.
// The form maps to the Enquiry model; submission is wired with the typed client later.
export function EnquiryCta({
  id = 'contact',
  heading,
  subtitle,
  prefillDestination,
}: EnquiryCtaProps = {}) {
  const t = messages.enquiryCta;
  const fm = t.form;
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

    const payload = buildEnquiryCtaPayload({
      name,
      email,
      destination: String(fd.get('destination') ?? ''),
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
    <section id={id} className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="shadow-card grid overflow-hidden rounded-2xl lg:grid-cols-5">
          {/* Copy */}
          <div className="bg-primary text-primary-foreground flex flex-col justify-center gap-6 p-8 sm:p-12 lg:col-span-2">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
                {heading ?? t.heading}
              </h2>
              <p className="text-primary-foreground/85 text-lg text-pretty">
                {subtitle ?? t.subtitle}
              </p>
            </div>
            <ul className="space-y-3">
              {t.benefits.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <span className="bg-primary-foreground/15 flex size-6 shrink-0 items-center justify-center rounded-full">
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
          <div className="bg-card flex flex-col justify-center p-8 sm:p-12 lg:col-span-3">
            {status === 'success' ? (
              <EnquirySuccess />
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-4"
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
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="enq-name">{fm.name}</FieldLabel>
                  <Input
                    id="enq-name"
                    name="name"
                    type="text"
                    placeholder={fm.namePlaceholder}
                    className={LEAD_FIELD_CLASS}
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={
                      fieldErrors.name ? 'enq-name-error' : undefined
                    }
                  />
                  <FieldErrorText
                    id="enq-name-error"
                    field="name"
                    code={fieldErrors.name}
                  />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="enq-email">{fm.email}</FieldLabel>
                  <Input
                    id="enq-email"
                    name="email"
                    type="email"
                    placeholder={fm.emailPlaceholder}
                    className={LEAD_FIELD_CLASS}
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={
                      fieldErrors.email ? 'enq-email-error' : undefined
                    }
                  />
                  <FieldErrorText
                    id="enq-email-error"
                    field="email"
                    code={fieldErrors.email}
                  />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="enq-destination">
                    {fm.destination}
                  </FieldLabel>
                  <Input
                    id="enq-destination"
                    name="destination"
                    type="text"
                    defaultValue={prefillDestination}
                    placeholder={fm.destinationPlaceholder}
                    className={LEAD_FIELD_CLASS}
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
                    : t.cta}
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

export default EnquiryCta;
