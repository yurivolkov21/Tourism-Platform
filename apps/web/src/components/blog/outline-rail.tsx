'use client';

import { useEffect, useState } from 'react';

import { cn } from '@tourism/ui';

import type { OutlineItem } from '../../lib/blog/derive';

/**
 * The article outline rail (sticky aside on desktop, order-first list on mobile — markup
 * unchanged from the previous inline version) with a scrollspy: the heading currently in
 * the top third of the viewport highlights its link. Progressive enhancement — without
 * IntersectionObserver the rail renders exactly as before, just without the highlight.
 */
export function OutlineRail({ items, heading }: { items: OutlineItem[]; heading: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    // The band matches the headings' scroll-mt-28: active = heading inside the top third.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: '-96px 0px -66% 0px', threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="max-lg:order-first">
      <nav aria-label={heading} className="lg:sticky lg:top-28">
        <h2 className="font-sans text-sm font-semibold tracking-wide uppercase">{heading}</h2>
        <ul className="border-border/60 mt-3 space-y-2 border-l pl-4 text-sm">
          {items.map((item, i) => (
            <li key={`${item.id}-${i}`} className={item.depth === 3 ? 'pl-3' : undefined}>
              <a
                href={`#${item.id}`}
                aria-current={activeId === item.id ? 'true' : undefined}
                className={cn(
                  'transition-colors',
                  activeId === item.id
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-primary',
                )}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default OutlineRail;
