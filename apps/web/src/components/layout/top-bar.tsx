import { MailIcon, PhoneIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { FacebookIcon, InstagramIcon, TwitterIcon } from '../icons/social';

const socials = [
  { Icon: FacebookIcon, label: 'Facebook' },
  { Icon: InstagramIcon, label: 'Instagram' },
  { Icon: TwitterIcon, label: 'X' },
];

// Thin utility strip above the main header (Lily-style), emerald on ivory text.
// Hidden on small screens to keep mobile clean.
export function TopBar() {
  const t = messages.topBar;
  const f = messages.footer;

  return (
    <div className="bg-primary text-primary-foreground max-sm:hidden">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-6 px-4 text-xs sm:px-6 lg:px-8">
        <p className="text-primary-foreground/85 truncate">{t.tagline}</p>

        <div className="flex items-center gap-5">
          <a
            href={`mailto:${f.email}`}
            className="hover:text-primary-foreground text-primary-foreground/85 inline-flex items-center gap-1.5 transition-colors max-md:hidden"
          >
            <MailIcon className="size-3.5" />
            {f.email}
          </a>
          <a
            href={`tel:${f.phone.replace(/\s/g, '')}`}
            className="hover:text-primary-foreground text-primary-foreground/85 inline-flex items-center gap-1.5 transition-colors"
          >
            <PhoneIcon className="size-3.5" />
            {f.phone}
          </a>
          <div className="bg-primary-foreground/25 h-4 w-px" />
          <div className="flex items-center gap-3">
            {socials.map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="text-primary-foreground/85 hover:text-primary-foreground transition-colors"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
