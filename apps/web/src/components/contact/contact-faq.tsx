import Link from 'next/link';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { Reveal } from '../marketing/reveal';

/** Short pre-sales FAQ on the contact page (curated subset; full list at /faq). */
export function ContactFaq() {
  const t = messages.contact.faq;

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mb-8 flex items-center gap-3">
            <span className="bg-primary h-6 w-1.5 shrink-0 rounded-full" aria-hidden />
            <div>
              <h2 className="font-heading text-2xl font-semibold sm:text-3xl">{t.heading}</h2>
              <p className="text-muted-foreground mt-1 text-pretty">
                {t.subtitle}{' '}
                <Link href="/faq" className="text-primary font-medium hover:underline">
                  {t.seeAll}
                </Link>
                .
              </p>
            </div>
          </div>
          <Accordion className="w-full">
            {t.items.map((item, i) => (
              <AccordionItem key={item.q} value={`contact-faq-${i}`}>
                <AccordionTrigger className="text-left">
                  <span className="font-semibold">{item.q}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-pretty">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

export default ContactFaq;
