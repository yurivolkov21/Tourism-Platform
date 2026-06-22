import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRightIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { FaqGroups } from '../../components/faq/faq-groups';
import { EnquiryCta } from '../../components/marketing/enquiry-cta';

export const metadata: Metadata = {
  title: 'FAQs — frequently asked questions',
  description:
    'Answers to the questions travellers ask us most — booking, payment, itineraries, guides, cancellations, and travelling in Vietnam.',
};

// FAQPage structured data (JSON-LD). Built from our own static catalogue (no user input),
// serialised with JSON.stringify — the standard, safe pattern for SEO rich results.
function faqJsonLd() {
  const t = messages.faqPage;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.categories.flatMap((category) =>
      category.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    ),
  };
}

export default function FaqPage() {
  const t = messages.faqPage;

  return (
    <main>
      <script
        type="application/ld+json"
        // Static, controlled content; escape `<` so a value can never break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()).replace(/</g, '\\u003c') }}
      />

      {/* Header band */}
      <section className="bg-muted/40 border-border border-b">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="text-muted-foreground mb-4 flex items-center justify-center gap-1.5 text-sm"
          >
            <Link href="/" className="hover:text-foreground">
              {t.breadcrumbHome}
            </Link>
            <ChevronRightIcon className="size-4" />
            <span className="text-foreground">{t.breadcrumbCurrent}</span>
          </nav>
          <h1 className="font-heading text-3xl font-bold text-balance sm:text-4xl lg:text-5xl">
            {t.title}
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg text-pretty">
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* Grouped questions */}
      <section className="py-14 sm:py-20">
        <div className="px-4 sm:px-6 lg:px-8">
          <FaqGroups />
        </div>
      </section>

      <EnquiryCta />
    </main>
  );
}
