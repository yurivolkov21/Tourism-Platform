import {
  ArrowRightIcon,
  ChevronRightIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from 'lucide-react';

import { messages } from '@tourism/i18n';

import { Logo } from '../brand/logo';
import { FacebookIcon, InstagramIcon, TwitterIcon } from '../icons/social';
import { fetchActiveCategories } from '../../lib/api/categories';

const infoIcons = [ClockIcon, MapPinIcon, PhoneIcon, MailIcon] as const;
const socials = [
  { Icon: FacebookIcon, label: 'Facebook' },
  { Icon: InstagramIcon, label: 'Instagram' },
  { Icon: TwitterIcon, label: 'X' },
];

// Hà Nội office (VTC Online building, Tam Trinh) — matches the Information column + contact page.
const MAP_LINK = 'https://www.google.com/maps?q=18+Tam+Trinh,+Tuong+Mai,+Ha+Noi';

export async function SiteFooter() {
  const f = messages.footer;
  const contact = messages.contact.info;
  const categories = await fetchActiveCategories();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        {/* Conversion band — CTA + newsletter */}
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-4 lg:col-span-7">
            <Logo className="[&>span:first-child]:[--nx-tone:var(--background)] [&>span:last-child]:text-background" />
            <h2 className="font-heading text-2xl font-semibold text-balance sm:text-3xl">
              {f.ctaHeading}
            </h2>
            <a
              href="/contact"
              className="bg-primary text-primary-foreground hover:bg-primary/90 group inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors"
            >
              {f.ctaButton}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          <div className="space-y-3 lg:col-span-5">
            <h3 className="font-sans text-sm font-semibold tracking-wide uppercase">
              {f.newsletterHeading}
            </h3>
            <p className="text-background/80 text-sm text-pretty">{f.newsletterText}</p>
            <form action="#" className="flex gap-2">
              <input
                type="email"
                name="email"
                aria-label={f.newsletterPlaceholder}
                placeholder={f.newsletterPlaceholder}
                className="border-background/25 bg-background/10 text-background placeholder:text-background/60 focus-visible:ring-background/40 h-11 w-full rounded-full border px-4 text-sm outline-none focus-visible:ring-2"
              />
              <button
                type="submit"
                className="bg-background text-foreground hover:bg-background/90 h-11 shrink-0 rounded-full px-5 text-sm font-medium transition-colors"
              >
                {f.newsletterCta}
              </button>
            </form>
          </div>
        </div>

        <div className="border-background/15 my-12 border-t" />

        {/* Columns */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Information */}
          <div className="space-y-4">
            <h3 className="font-sans text-sm font-semibold tracking-wide uppercase">
              {f.infoHeading}
            </h3>
            <ul className="space-y-3">
              {contact.map((item, i) => {
                const Icon = infoIcons[i];
                return (
                  <li key={item.title} className="text-background/80 flex gap-2.5 text-sm">
                    <Icon className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {item.lines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-background/80 hover:text-background inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
            >
              {f.viewOnMap}
              <ArrowRightIcon className="size-3.5" />
            </a>
          </div>

          {/* Browse tours — real categories */}
          <div className="space-y-4">
            <h3 className="font-sans text-sm font-semibold tracking-wide uppercase">
              {f.browseHeading}
            </h3>
            <ul className="space-y-2.5">
              <FooterLink href="/tours" label={f.allTours} />
              {categories.map((c) => (
                <FooterLink key={c.slug} href={`/tours?category=${c.slug}`} label={c.name} />
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="font-sans text-sm font-semibold tracking-wide uppercase">
              {f.supportHeading}
            </h3>
            <ul className="space-y-2.5">
              {f.support.map((l) => (
                <FooterLink key={l.label} href={l.href} label={l.label} />
              ))}
            </ul>
          </div>

          {/* Follow us */}
          <div className="space-y-4">
            <h3 className="font-sans text-sm font-semibold tracking-wide uppercase">
              {f.socialHeading}
            </h3>
            <div className="flex gap-3">
              {socials.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="border-background/25 text-background/90 hover:bg-background/10 flex size-9 items-center justify-center rounded-full border transition-colors"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
            <p className="text-background/70 text-sm text-pretty">{f.tagline}</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-background/15 mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-sm sm:flex-row">
          <p className="text-background/75">
            © {year} {messages.brand.name}. {f.rights}
          </p>
          <p className="text-background/60 font-heading">{f.motto}</p>
        </div>
      </div>
    </footer>
  );
}

/** One footer nav link with a chevron. */
function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        href={href}
        className="text-background/80 hover:text-background inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ChevronRightIcon className="size-3.5" />
        {label}
      </a>
    </li>
  );
}

export default SiteFooter;
