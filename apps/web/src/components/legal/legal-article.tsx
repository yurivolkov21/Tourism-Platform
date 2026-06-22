import Link from 'next/link';
import { ChevronRightIcon, TriangleAlertIcon } from 'lucide-react';

import type { LegalDoc } from '../../content/legal-page';

/** Renders a long-form legal/policy document with a header band and numbered sections. */
export function LegalArticle({ doc }: { doc: LegalDoc }) {
  return (
    <main>
      {/* Header band */}
      <section className="bg-muted/40 border-border border-b">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="text-muted-foreground mb-4 flex items-center gap-1.5 text-sm"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRightIcon className="size-4" />
            <span className="text-foreground">{doc.breadcrumb}</span>
          </nav>
          <h1 className="font-heading text-3xl font-bold text-balance sm:text-4xl">{doc.title}</h1>
          <p className="text-muted-foreground mt-3 text-sm">{doc.updated}</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Pre-launch review callout */}
        <div className="border-warning/40 bg-warning/10 mb-10 flex gap-3 rounded-lg border p-4 text-sm">
          <TriangleAlertIcon className="text-warning size-5 shrink-0" />
          <p className="text-foreground/90 leading-relaxed">{doc.reviewNote}</p>
        </div>

        <div className="space-y-4">
          {doc.intro.map((p, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed text-pretty">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-10 space-y-10">
          {doc.sections.map((section, i) => (
            <section key={section.heading}>
              <h2 className="font-heading mb-3 text-xl font-semibold">
                {i + 1}. {section.heading}
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
      </article>
    </main>
  );
}

export default LegalArticle;
