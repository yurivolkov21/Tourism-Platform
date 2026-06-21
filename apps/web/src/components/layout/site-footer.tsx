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

const infoIcons = [ClockIcon, MapPinIcon, PhoneIcon, MailIcon] as const;
const socials = [
  { Icon: FacebookIcon, label: 'Facebook' },
  { Icon: InstagramIcon, label: 'Instagram' },
  { Icon: TwitterIcon, label: 'X' },
];

const MAP_LINK = 'https://www.google.com/maps?q=Hoan+Kiem+Lake,+Hanoi,+Vietnam';

export function SiteFooter() {
  const f = messages.footer;
  const contact = messages.contact.info;
  const tours = messages.nav.toursMenu.items;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        {/* Brand + motto */}
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          {/* Invert the monogram badge for the dark footer; ivory wordmark */}
          <Logo className="[&>span:first-child]:bg-background [&>span:first-child]:text-primary [&>span:last-child]:text-background" />
          <p className="font-heading text-xl font-semibold sm:text-2xl">{f.motto}</p>
        </div>

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

          {/* Tours & service */}
          <div className="space-y-4">
            <h3 className="font-sans text-sm font-semibold tracking-wide uppercase">
              {f.toursHeading}
            </h3>
            <ul className="space-y-2.5">
              {tours.map((t) => (
                <li key={t.label}>
                  <a
                    href={t.href}
                    className="text-background/80 hover:text-background inline-flex items-center gap-1.5 text-sm transition-colors"
                  >
                    <ChevronRightIcon className="size-3.5" />
                    {t.label}
                  </a>
                </li>
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
            <ul className="text-background/80 space-y-2.5 text-sm">
              <li>
                <a href={`tel:${f.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-background transition-colors">
                  <PhoneIcon className="size-4" />
                  {f.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${f.email}`} className="inline-flex items-center gap-2 hover:text-background transition-colors">
                  <MailIcon className="size-4" />
                  {f.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="font-sans text-sm font-semibold tracking-wide uppercase">
              {f.newsletterHeading}
            </h3>
            <p className="text-background/80 text-sm text-pretty">{f.newsletterText}</p>
            <form action="#" className="flex flex-col gap-2.5">
              <input
                type="email"
                name="email"
                aria-label={f.newsletterPlaceholder}
                placeholder={f.newsletterPlaceholder}
                className="border-background/25 bg-background/10 text-background placeholder:text-background/60 focus-visible:ring-background/40 h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md px-4 text-sm font-medium transition-colors"
              >
                {f.newsletterCta}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-background/15 mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-sm sm:flex-row">
          <p className="text-background/75">
            © {year} {messages.brand.name}. {f.rights}
          </p>
          <ul className="text-background/75 flex flex-wrap items-center gap-x-5 gap-y-2">
            {f.support.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="hover:text-background transition-colors">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
