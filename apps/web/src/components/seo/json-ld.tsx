import { messages } from '@tourism/i18n';

import { SITE_URL, absoluteUrl } from '../../lib/site';

/**
 * Serialises a JSON-LD object into a script tag. Content is our own data (brand / catalogue), but we
 * still escape `<` to `<` so a stray `</script>` in any string can't break out of the tag.
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  // dangerouslySetInnerHTML is required for a JSON-LD <script>; the `<` escape above neutralises any
  // `</script>` breakout, and the data is our own (brand / catalogue), not user-supplied HTML.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

/** Site-wide organisation card (rendered once in the root layout). */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'TravelAgency',
        name: messages.brand.name,
        description: messages.brand.tagline,
        url: SITE_URL,
        logo: absoluteUrl('/icon.svg'),
        email: messages.footer.email,
        telephone: messages.footer.phone,
        address: {
          '@type': 'PostalAddress',
          streetAddress: '184 Lê Đại Hành, Phú Thọ',
          addressLocality: 'Hồ Chí Minh City',
          addressCountry: 'VN',
        },
        areaServed: 'Vietnam',
      }}
    />
  );
}

export type BreadcrumbEntry = { name: string; path: string };

/** BreadcrumbList for rich breadcrumb snippets. `path` is site-relative. */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbEntry[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      }}
    />
  );
}

export type TourJsonLdProps = {
  name: string;
  description?: string;
  image?: string;
  slug: string;
  price: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
};

/** Product schema for a tour detail page (price + aggregate rating drive rich results). */
export function TourJsonLd({
  name,
  description,
  image,
  slug,
  price,
  currency,
  rating,
  reviewCount,
}: TourJsonLdProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    url: absoluteUrl(`/tours/${slug}`),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    offers: {
      '@type': 'Offer',
      price: String(price),
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      url: absoluteUrl(`/tours/${slug}`),
    },
  };
  if (rating && reviewCount && reviewCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount,
    };
  }
  return <JsonLd data={data} />;
}

export type ArticleJsonLdProps = {
  title: string;
  description?: string;
  image?: string;
  slug: string;
  datePublished?: string;
  /** Real author name → Person; absent → Organization (brand) byline. */
  authorName?: string;
};

/** Article schema for a journal post. Public posts carry no personal author → brand byline. */
export function ArticleJsonLd({
  title,
  description,
  image,
  slug,
  datePublished,
  authorName,
}: ArticleJsonLdProps) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        url: absoluteUrl(`/blog/${slug}`),
        ...(description ? { description } : {}),
        ...(image ? { image } : {}),
        ...(datePublished ? { datePublished } : {}),
        author: authorName
          ? { '@type': 'Person', name: authorName }
          : {
              '@type': 'Organization',
              name: messages.brand.name,
              url: SITE_URL,
            },
        publisher: {
          '@type': 'Organization',
          name: messages.brand.name,
          logo: { '@type': 'ImageObject', url: absoluteUrl('/icon.svg') },
        },
      }}
    />
  );
}
