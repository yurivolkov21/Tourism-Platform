import { ArrowUpRightIcon, Clock8Icon, MapPinIcon } from 'lucide-react';

import { Card, CardContent } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Embedded map for the head office.
const MAP_SRC = 'https://www.google.com/maps?q=Hoan+Kiem+Lake,+Hanoi,+Vietnam&output=embed';

// Contact-page "Our offices" — the head-office map beside per-office address cards (city, address,
// hours, get-directions link). Multiple locations read as an established, on-the-ground operator.
export function ContactInfo() {
  const t = messages.contact;

  return (
    <section className="bg-muted py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl sm:mb-14">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
            {t.officesHeading}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg text-pretty">{t.officesSubtitle}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch lg:gap-12">
          {/* Head-office map */}
          <div className="ring-border overflow-hidden rounded-xl ring-1">
            <iframe
              src={MAP_SRC}
              title={messages.footer.mapHeading}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-4/3 size-full min-h-80 border-0"
            />
          </div>

          {/* Office address cards */}
          <div className="flex flex-col gap-6">
            {t.offices.map((office) => (
              <Card key={office.city} className="flex-1">
                <CardContent className="flex h-full flex-col gap-4 p-6 sm:p-7">
                  <h3 className="font-heading text-xl font-semibold">{office.city}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2.5">
                      <MapPinIcon className="text-primary mt-0.5 size-4.5 shrink-0" />
                      <span className="text-muted-foreground">
                        {office.lines.map((line) => (
                          <span key={line} className="block">
                            {line}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock8Icon className="text-primary size-4.5 shrink-0" />
                      <span className="text-muted-foreground">{office.hours}</span>
                    </div>
                  </div>
                  <a
                    href={office.mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary mt-auto inline-flex items-center gap-1.5 text-sm font-semibold"
                  >
                    {t.getDirections}
                    <ArrowUpRightIcon className="size-4" />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactInfo;
