import { messages } from '@tourism/i18n';

import { Logo } from '../brand/logo';

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-sans text-sm font-semibold">{heading}</h3>
      <ul className="text-muted-foreground space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="hover:text-primary transition-colors">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const f = messages.footer;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-muted/40 border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo />
            <p className="text-muted-foreground max-w-xs text-sm">{f.tagline}</p>
          </div>

          <FooterCol heading={f.exploreHeading} links={f.explore} />
          <FooterCol heading={f.supportHeading} links={f.support} />

          <div className="space-y-3">
            <h3 className="font-sans text-sm font-semibold">{f.contactHeading}</h3>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <a href={`mailto:${f.email}`} className="hover:text-primary transition-colors">
                  {f.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${f.phone.replace(/\s/g, '')}`}
                  className="hover:text-primary transition-colors"
                >
                  {f.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-muted-foreground mt-10 border-t pt-6 text-sm">
          © {year} {messages.brand.name}. {f.rights}
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
