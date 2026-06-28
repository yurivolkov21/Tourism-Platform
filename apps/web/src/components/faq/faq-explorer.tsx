'use client';

import { useState } from 'react';
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import {
  CompassIcon,
  CreditCardIcon,
  PlaneIcon,
  PlusIcon,
  RefreshCwIcon,
  RouteIcon,
  SearchIcon,
  type LucideIcon,
} from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, Input } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { slugify } from '../../lib/slug';

// Icon per category, in catalogue order.
const CATEGORY_ICONS: readonly LucideIcon[] = [
  CreditCardIcon,
  RouteIcon,
  CompassIcon,
  RefreshCwIcon,
  PlaneIcon,
];

/** Searchable, grouped FAQ accordion with category icons and a plus/minus toggle. */
export function FaqExplorer() {
  const t = messages.faqPage;
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const groups = t.categories
    .map((category, idx) => ({
      category,
      icon: CATEGORY_ICONS[idx] ?? CompassIcon,
      items: q
        ? category.items.filter((i) =>
            `${i.question} ${i.answer}`.toLowerCase().includes(q),
          )
        : category.items,
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      {/* Search */}
      <div className="relative mb-10">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchLabel}
          className="bg-background h-12 rounded-full pr-4 pl-11 text-sm"
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground py-8 text-pretty">{t.noResults}</p>
      ) : (
        <div className="space-y-12">
          {groups.map(({ category, icon: Icon, items }) => (
            <section
              key={category.title}
              id={slugify(category.title)}
              className="scroll-mt-24"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="border-border bg-card text-primary flex size-10 shrink-0 items-center justify-center rounded-full border">
                  <Icon className="size-5" />
                </span>
                <h2 className="font-heading text-xl font-semibold">
                  {category.title}
                </h2>
              </div>

              <Accordion className="space-y-3">
                {items.map((item) => (
                  <AccordionItem
                    key={item.question}
                    value={item.question}
                    className="bg-card border-border rounded-xl border px-4"
                  >
                    <AccordionPrimitive.Header className="flex">
                      <AccordionPrimitive.Trigger
                        data-slot="accordion-trigger"
                        className="focus-visible:text-primary flex flex-1 items-center justify-between gap-4 py-4 text-left text-base font-medium outline-none"
                      >
                        {item.question}
                        <PlusIcon className="text-muted-foreground pointer-events-none size-5 shrink-0 transition-transform duration-200 in-data-open:rotate-180 [&>path:last-child]:origin-center [&>path:last-child]:transition-all [&>path:last-child]:duration-200 in-data-open:[&>path:last-child]:rotate-90 in-data-open:[&>path:last-child]:opacity-0" />
                      </AccordionPrimitive.Trigger>
                    </AccordionPrimitive.Header>
                    <AccordionContent className="pb-4">
                      <p className="text-muted-foreground leading-relaxed text-pretty">
                        {item.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default FaqExplorer;
