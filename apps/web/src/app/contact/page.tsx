import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { ContentHero } from '../../components/content/content-hero';
import { ContactInquiry } from '../../components/contact/contact-inquiry';
import { ContactLocation } from '../../components/contact/contact-location';
import { ContactFaq } from '../../components/contact/contact-faq';
import { CtaBand } from '../../components/marketing/cta-band';
import { fetchActiveCategories } from '../../lib/api/categories';

export const metadata: Metadata = {
  title: messages.pageMeta.contact.title,
  description: messages.pageMeta.contact.description,
};

// ISR: the enquiry "interest" options come from live tour categories (revalidated hourly).
export const revalidate = 3600;

export default async function ContactPage() {
  const t = messages.contact;
  // Live category names power the interest dropdown; the form falls back to the i18n list on error.
  const categories = await fetchActiveCategories();
  const interestOptions = categories.map((c) => c.name);

  return (
    <main>
      <ContentHero
        breadcrumb={t.breadcrumb}
        title={t.heading}
        subtitle={t.subtitle}
      />
      <ContactInquiry interestOptions={interestOptions} />
      <ContactLocation />
      <ContactFaq />
      <CtaBand
        heading={t.ctaBand.heading}
        subtitle={t.ctaBand.subtitle}
        cta={t.ctaBand.cta}
      />
    </main>
  );
}
