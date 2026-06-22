import Link from 'next/link';
import { ChevronRightIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

/** Shared header band for content pages (FAQ, legal): soft emerald wash + breadcrumb + title. */
export function ContentHero({
  breadcrumb,
  title,
  meta,
  subtitle,
}: {
  breadcrumb: string;
  title: string;
  meta?: string;
  subtitle?: string;
}) {
  return (
    <section className="from-primary/10 border-border border-b bg-linear-to-b to-transparent">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="text-muted-foreground mb-4 flex items-center gap-1.5 text-sm"
        >
          <Link href="/" className="hover:text-foreground">
            {messages.common.home}
          </Link>
          <ChevronRightIcon className="size-4" />
          <span className="text-foreground">{breadcrumb}</span>
        </nav>

        <h1 className="font-heading text-3xl font-bold text-balance sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {meta ? <p className="text-muted-foreground mt-3 text-sm">{meta}</p> : null}
        {subtitle ? (
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg text-pretty">{subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}

export default ContentHero;
