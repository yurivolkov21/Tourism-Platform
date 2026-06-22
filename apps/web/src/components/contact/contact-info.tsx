import { Clock8Icon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';

import { Card, CardContent } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Icons align by index to messages.contact.info.
const infoIcons = [Clock8Icon, MapPinIcon, PhoneIcon, MailIcon] as const;

const MAP_SRC = 'https://www.google.com/maps?q=Hoan+Kiem+Lake,+Hanoi,+Vietnam&output=embed';

// Contact-page info section (hours / address / phone / email). The enquiry form that maps
// the Enquiry model is a separate component, added when the Contact page is assembled.
export function ContactInfo() {
  const t = messages.contact;

  return (
    <section className="bg-muted py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Location map */}
          <div className="ring-border overflow-hidden rounded-xl ring-1">
            <iframe
              src={MAP_SRC}
              title={messages.footer.mapHeading}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-4/3 w-full border-0"
            />
          </div>

          <div>
            <h3 className="font-heading mb-4 text-2xl font-semibold sm:text-3xl">{t.intro.title}</h3>
            <p className="text-muted-foreground mb-10 text-lg text-pretty">{t.intro.body}</p>

            <div className="grid gap-5 sm:grid-cols-2">
              {t.info.map((info, i) => {
                const Icon = infoIcons[i];
                return (
                  <Card key={info.title}>
                    <CardContent className="flex flex-col items-center gap-3 text-center">
                      <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
                        <Icon className="size-5" />
                      </span>
                      <h4 className="font-sans font-semibold">{info.title}</h4>
                      <div className="text-muted-foreground text-sm">
                        {info.lines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactInfo;
