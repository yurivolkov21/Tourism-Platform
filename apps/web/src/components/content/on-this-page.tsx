'use client';

import { useEffect, useState } from 'react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

export type TocItem = { id: string; label: string };

/** Sticky "On this page" navigation with scroll-spy active highlighting. */
export function OnThisPage({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label={messages.common.onThisPage} className="text-sm">
      <p className="font-heading text-foreground mb-3 font-semibold">
        {messages.common.onThisPage}
      </p>
      <ul className="border-border space-y-0.5 border-l">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                '-ml-px block border-l-2 py-1 pl-4 text-pretty transition-colors',
                active === item.id
                  ? 'border-primary text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default OnThisPage;
