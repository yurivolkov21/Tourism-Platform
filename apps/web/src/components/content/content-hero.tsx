import Image from 'next/image';
import Link from 'next/link';
import { ChevronRightIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { getSiteMedia } from '../../lib/api/site-media';
import { siteImage } from '../../lib/site-media';

// Built-in default for content-page / Journal headers — overridable via the
// `content-hero` Appearance slot; a page-supplied `image` prop still wins.
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1753003491860-89b500bc62f3?w=1920&q=70&auto=format&fit=crop';

/** Shared header for content pages (FAQ, legal): full-bleed image + scrim + breadcrumb + title. */
export async function ContentHero({
  breadcrumb,
  title,
  meta,
  subtitle,
  image,
}: {
  breadcrumb: string;
  title: string;
  meta?: string;
  subtitle?: string;
  image?: string;
}) {
  const heroImage =
    image ?? siteImage(await getSiteMedia(), 'content-hero', DEFAULT_IMAGE);
  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src={heroImage}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Scrim for legibility — darker toward the bottom where copy sits */}
      <div className="from-overlay/85 via-overlay/55 to-overlay/45 absolute inset-0 -z-10 bg-linear-to-t" />

      <div className="text-on-media mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <nav
          aria-label={messages.common.breadcrumbLabel}
          className="text-on-media/80 mb-4 flex items-center gap-1.5 text-sm"
        >
          <Link href="/" className="hover:text-on-media">
            {messages.common.home}
          </Link>
          <ChevronRightIcon className="size-4" aria-hidden="true" />
          <span className="text-on-media">{breadcrumb}</span>
        </nav>

        <h1 className="font-heading text-3xl font-bold text-balance sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {meta ? <p className="text-on-media/80 mt-3 text-sm">{meta}</p> : null}
        {subtitle ? (
          <p className="text-on-media/90 mt-4 max-w-2xl text-lg text-pretty">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default ContentHero;
