'use client';

import { useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { buildContactPayload, isValidEnquiry } from '../../lib/enquiry-form';
import { submitEnquiry } from '../../lib/api/enquiry';
import {
  LEAD_FIELD_CLASS,
  LEAD_SELECT_CLASS,
  LEAD_TEXTAREA_CLASS,
} from '../../lib/form-field';
import { EnquiryStatus, EnquirySuccess, type EnquiryFormStatus } from '../marketing/enquiry-status';
import { Reveal } from '../marketing/reveal';
import { TechMarquee } from '../marketing/tech-marquee';

/**
 * Contact-page lead section (Shadcn Space "Contact 01" layout, brand-tokenized):
 * contact details + "Built with" strip on the left, a real enquiry form on the right.
 * The form posts to /enquiries via submitEnquiry (the first-class contact channel).
 */
export function ContactInquiry({
  interestOptions = [],
}: {
  /** Interest dropdown options (live tour-category names). Falls back to the curated i18n list. */
  interestOptions?: string[];
} = {}) {
  const t = messages.contact.inquiry;
  const f = t.form;
  const options: readonly string[] =
    interestOptions.length > 0 ? interestOptions : f.interestOptions;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('');
  const [message, setMessage] = useState('');
  const [terms, setTerms] = useState(false);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<EnquiryFormStatus>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = buildContactPayload({ firstName, lastName, email, interest, message, website });
    if (!isValidEnquiry(payload) || !terms) {
      setStatus('invalid');
      return;
    }
    setStatus('submitting');
    const res = await submitEnquiry(payload);
    setStatus(res.ok ? 'success' : res.rateLimited ? 'rateLimited' : 'error');
  }

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left: details + tech strip */}
          <Reveal>
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-5">
                <span className="text-muted-foreground inline-flex items-center gap-2.5 text-base">
                  <span className="bg-primary size-2 rounded-full" aria-hidden />
                  {t.eyebrow}
                </span>
                <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                  {t.heading}
                </h2>
                <p className="text-muted-foreground text-lg text-pretty">{t.body}</p>
              </div>

              <div className="flex flex-wrap gap-x-12 gap-y-6">
                {t.details.map((d) => (
                  <div key={d.label} className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-sm">{d.label}</span>
                    <span className="text-primary text-base font-medium">{d.value}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex flex-col gap-5">
                <span className="text-muted-foreground text-base">{t.trustedByLabel}</span>
                <TechMarquee />
              </div>
            </div>
          </Reveal>

          {/* Right: real enquiry form */}
          <Reveal>
            <Card className="rounded-2xl p-8">
              <CardHeader className="p-0">
                <CardTitle className="text-primary text-2xl font-semibold">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-6">
                {status === 'success' ? (
                  <EnquirySuccess />
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Honeypot */}
                    <input
                      type="text"
                      name="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="hidden"
                    />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-firstName">{f.firstNameLabel}</Label>
                        <Input
                          id="contact-firstName"
                          autoComplete="given-name"
                          placeholder={f.firstNamePlaceholder}
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={LEAD_FIELD_CLASS}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-lastName">{f.lastNameLabel}</Label>
                        <Input
                          id="contact-lastName"
                          autoComplete="family-name"
                          placeholder={f.lastNamePlaceholder}
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={LEAD_FIELD_CLASS}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-email">{f.emailLabel}</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        autoComplete="email"
                        placeholder={f.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={LEAD_FIELD_CLASS}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-interest">{f.interestLabel}</Label>
                      <Select value={interest} onValueChange={(v) => setInterest(v ?? '')}>
                        <SelectTrigger id="contact-interest" className={LEAD_SELECT_CLASS}>
                          <SelectValue placeholder={f.interestPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-message">{f.messageLabel}</Label>
                      <Textarea
                        id="contact-message"
                        placeholder={f.messagePlaceholder}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        className={LEAD_TEXTAREA_CLASS}
                      />
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Checkbox
                        id="contact-terms"
                        checked={terms}
                        onCheckedChange={(c) => setTerms(c === true)}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="contact-terms"
                        className="text-muted-foreground text-sm font-normal"
                      >
                        {f.terms}
                      </Label>
                    </div>
                    <EnquiryStatus status={status} />
                    <Button
                      type="submit"
                      size="lg"
                      disabled={status === 'submitting'}
                      className="w-full disabled:opacity-70"
                    >
                      {status === 'submitting' ? messages.enquiryForm.submitting : f.submit}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default ContactInquiry;
