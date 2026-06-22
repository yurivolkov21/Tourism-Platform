import { ArrowRightIcon, MailIcon, MessageCircleIcon, PhoneIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@tourism/ui';
import { messages } from '@tourism/i18n';

const channelIcons: Record<string, LucideIcon> = {
  phone: PhoneIcon,
  email: MailIcon,
  whatsapp: MessageCircleIcon,
};

// Contact-page "ways to reach us" — three action-led channel cards (call / email / WhatsApp).
// Each card is tappable (tel: / mailto: / wa.me) so the value is a real shortcut, not passive text.
export function ContactChannels() {
  const t = messages.contact;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
            {t.channelsHeading}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg text-pretty">{t.channelsSubtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {t.channels.map((c) => {
            const Icon = channelIcons[c.type] ?? PhoneIcon;
            return (
              <Card
                key={c.title}
                className="hover:ring-primary/40 hover:shadow-card group transition-all duration-300 ease-out-expo hover:-translate-y-0.5"
              >
                <CardContent className="flex flex-col items-start gap-4 p-7">
                  <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                    <Icon className="size-6" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-sans text-lg font-semibold">{c.title}</h3>
                    <p className="text-foreground text-base font-medium">{c.value}</p>
                    <p className="text-muted-foreground text-sm">{c.sub}</p>
                  </div>
                  <a
                    href={c.href}
                    className="text-primary mt-auto inline-flex items-center gap-1.5 text-sm font-semibold"
                  >
                    {c.actionLabel}
                    <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ContactChannels;
