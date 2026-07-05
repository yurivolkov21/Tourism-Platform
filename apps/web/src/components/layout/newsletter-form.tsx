'use client';

import { useState } from 'react';
import { CheckIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { subscribeNewsletter } from '../../lib/api/newsletter';
import { isValidNewsletterEmail } from '../../lib/newsletter-form';

type FormStatus = 'idle' | 'submitting' | 'success' | 'invalid' | 'rateLimited' | 'error';

/**
 * The footer newsletter signup, wired for real (was `action="#"`). Client island
 * on the server-rendered footer; submits straight from the browser so the API's
 * per-IP throttle budgets each visitor separately. Markup/classes match the
 * footer's dark conversion band.
 */
export function NewsletterForm() {
  const f = messages.footer;
  const [status, setStatus] = useState<FormStatus>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '');
    const website = String(fd.get('website') ?? '');
    if (!isValidNewsletterEmail(email)) {
      setStatus('invalid');
      return;
    }
    setStatus('submitting');
    const res = await subscribeNewsletter(email, website || undefined);
    setStatus(res.ok ? 'success' : res.rateLimited ? 'rateLimited' : 'error');
  }

  if (status === 'success') {
    return (
      <p role="status" className="text-background/80 flex items-center gap-2 text-sm">
        <span className="bg-background/15 flex size-6 shrink-0 items-center justify-center rounded-full">
          <CheckIcon className="size-3.5" aria-hidden="true" />
        </span>
        {f.newsletterSuccess}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        {/* Honeypot — hidden from real users; the API silently drops non-empty fills. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <input
          type="email"
          name="email"
          aria-label={f.newsletterPlaceholder}
          placeholder={f.newsletterPlaceholder}
          className="border-background/25 bg-background/10 text-background placeholder:text-background/60 focus-visible:ring-background/40 h-11 w-full rounded-full border px-4 text-sm outline-none focus-visible:ring-2"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="bg-background text-foreground hover:bg-background/90 h-11 shrink-0 cursor-pointer rounded-full px-5 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {status === 'submitting' ? f.newsletterSubmitting : f.newsletterCta}
        </button>
      </div>
      {status === 'invalid' || status === 'rateLimited' || status === 'error' ? (
        <p role="status" className="text-background/80 text-xs">
          {status === 'invalid'
            ? f.newsletterInvalid
            : status === 'rateLimited'
              ? f.newsletterRateLimited
              : f.newsletterError}
        </p>
      ) : null}
    </form>
  );
}

export default NewsletterForm;
