'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

/** Grouped FAQ accordions for the dedicated `/faq` page (one accordion per category). */
export function FaqGroups() {
  const t = messages.faqPage;

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      {t.categories.map((category) => (
        <div key={category.title}>
          <h2 className="font-heading text-primary mb-2 text-xl font-semibold">{category.title}</h2>
          <Accordion>
            {category.items.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger className="text-base">{item.question}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}

export default FaqGroups;
