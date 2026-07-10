import { TriangleAlertIcon } from 'lucide-react';

import type { LegalDoc } from '../../content/legal-page';
import { slugify } from '../../lib/slug';
import { ContentHero } from '../content/content-hero';
import { OnThisPage, type TocItem } from '../content/on-this-page';

/** Renders a long-form legal/policy document: emerald header, sticky TOC, numbered sections. */
export function LegalArticle({ doc }: { doc: LegalDoc }) {
  const toc: TocItem[] = doc.sections.map((section, i) => ({
    id: slugify(section.heading),
    label: `${i + 1}. ${section.heading}`,
  }));

  return (
    <main>
      <ContentHero
        breadcrumb={doc.breadcrumb}
        title={doc.title}
        meta={doc.updated}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-12">
          {/* Sticky table of contents */}
          <aside className="mb-10 lg:mb-0">
            <div className="lg:sticky lg:top-24">
              <OnThisPage items={toc} />
            </div>
          </aside>

          {/* Document body */}
          <div className="min-w-0 max-w-3xl">
            {doc.reviewNote ? (
              <div className="border-warning/40 bg-warning/10 mb-10 flex gap-3 rounded-lg border p-4 text-sm">
                <TriangleAlertIcon className="text-warning size-5 shrink-0" />
                <p className="text-foreground/90 leading-relaxed">
                  {doc.reviewNote}
                </p>
              </div>
            ) : null}

            <div className="space-y-4">
              {doc.intro.map((p, i) => (
                <p
                  key={i}
                  className="text-muted-foreground leading-relaxed text-pretty"
                >
                  {p}
                </p>
              ))}
            </div>

            <div className="divide-border mt-6 divide-y">
              {doc.sections.map((section, i) => (
                <section
                  key={section.heading}
                  id={slugify(section.heading)}
                  className="scroll-mt-24 py-8 first:pt-8"
                >
                  <h2 className="font-heading mb-3 flex items-center gap-3 text-xl font-semibold">
                    <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums">
                      {i + 1}
                    </span>
                    {section.heading}
                  </h2>
                  {section.paragraphs?.map((p, j) => (
                    <p
                      key={j}
                      className="text-muted-foreground leading-relaxed text-pretty not-last:mb-3"
                    >
                      {p}
                    </p>
                  ))}
                  {section.bullets ? (
                    <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
                      {section.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default LegalArticle;
