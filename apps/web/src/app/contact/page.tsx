import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { ContentHero } from '../../components/content/content-hero';
import { ContactChannels } from '../../components/contact/contact-channels';
import { ContactInfo } from '../../components/contact/contact-info';
import { PlanTripForm } from '../../components/marketing/plan-trip-form';
import { CtaBand } from '../../components/marketing/cta-band';

export const metadata: Metadata = {
  title: 'Contact us — Tourism Platform',
  description:
    'Get in touch with our local travel experts — office hours, address, phone, and email, plus a quick enquiry form. We usually reply within 24 hours.',
};

export default function ContactPage() {
  const t = messages.contact;

  return (
    <main>
      <ContentHero breadcrumb={t.breadcrumb} title={t.heading} subtitle={t.subtitle} />
      <ContactChannels />
      <ContactInfo />
      <PlanTripForm />
      <CtaBand heading={t.ctaBand.heading} subtitle={t.ctaBand.subtitle} cta={t.ctaBand.cta} />
    </main>
  );
}
