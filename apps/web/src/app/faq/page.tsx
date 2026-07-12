import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { slugify } from '../../lib/slug';
import { ContentHero } from '../../components/content/content-hero';
import {
  OnThisPage,
  type TocItem,
} from '../../components/content/on-this-page';
import { FaqExplorer } from '../../components/faq/faq-explorer';
import { EnquiryCta } from '../../components/marketing/enquiry-cta';

export const metadata: Metadata = {
  title: messages.pageMeta.faq.title,
  description: messages.pageMeta.faq.description,
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
  const toc: TocItem[] = t.categories.map((c) => ({
    id: slugify(c.title),
    label: c.title,
  }));

  return (
    <main>
      <script
        type="application/ld+json"
        // Static, controlled content; escape `<` so a value can never break out of the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd()).replace(/</g, '\\u003c'),
        }}
      />

      <ContentHero
        breadcrumb={t.breadcrumbCurrent}
        title={t.title}
        subtitle={t.subtitle}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-12">
          <aside className="mb-10 lg:mb-0">
            <div className="lg:sticky lg:top-24">
              <OnThisPage items={toc} />
            </div>
          </aside>

          <div className="min-w-0 max-w-3xl">
            <FaqExplorer />
          </div>
        </div>
      </div>

      <EnquiryCta heading={messages.enquiryCta.headings.faq} />
    </main>
  );
}
