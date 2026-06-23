import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@tourism/ui';
import { messages } from '@tourism/i18n';

/** Tour FAQ — a curated accordion of common questions about the trip. */
export function TourFaq() {
  const t = messages.tourDetail.faqSection;

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="bg-primary h-6 w-1.5 shrink-0 rounded-full" aria-hidden />
          <h2 className="font-heading text-2xl font-semibold sm:text-3xl">{t.heading}</h2>
        </div>
        <Accordion className="w-full">
          {t.items.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">
                <span className="font-semibold">{item.q}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-pretty">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export default TourFaq;
