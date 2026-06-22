import { CheckIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

const inputClass =
  'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 h-11 w-full rounded-md border px-3 text-sm outline-none transition-[box-shadow] focus-visible:ring-2';

// Lead-capture split: benefits-led copy on emerald, a compact enquiry form on a card.
// The form maps to the Enquiry model; submission is wired with the typed client later.
export function EnquiryCta() {
  const t = messages.enquiryCta;
  const fm = t.form;

  return (
    <section id="contact" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="shadow-card grid overflow-hidden rounded-2xl lg:grid-cols-5">
          {/* Copy */}
          <div className="bg-primary text-primary-foreground flex flex-col justify-center gap-6 p-8 sm:p-12 lg:col-span-2">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
                {t.heading}
              </h2>
              <p className="text-primary-foreground/85 text-lg text-pretty">{t.subtitle}</p>
            </div>
            <ul className="space-y-3">
              {t.benefits.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <span className="bg-primary-foreground/15 flex size-6 shrink-0 items-center justify-center rounded-full">
                    <CheckIcon className="size-3.5" />
                  </span>
                  <span className="text-primary-foreground/90 text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form */}
          <div className="bg-card flex flex-col justify-center p-8 sm:p-12 lg:col-span-3">
            <form action="#contact" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="enq-name" className="text-sm font-medium">
                  {fm.name}
                </label>
                <input id="enq-name" name="name" type="text" placeholder={fm.namePlaceholder} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="enq-email" className="text-sm font-medium">
                  {fm.email}
                </label>
                <input id="enq-email" name="email" type="email" placeholder={fm.emailPlaceholder} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="enq-destination" className="text-sm font-medium">
                  {fm.destination}
                </label>
                <input id="enq-destination" name="destination" type="text" placeholder={fm.destinationPlaceholder} className={inputClass} />
              </div>

              <button type="submit" className={cn(buttonVariants({ size: 'lg' }), 'mt-1 w-full')}>
                {t.cta}
              </button>
              <p className="text-muted-foreground text-xs">{t.note}</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EnquiryCta;
