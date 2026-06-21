'use client';

import { useEffect, useState } from 'react';
import { ArrowUpIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Appears after scrolling down; sits above the FloatingContact bubble.
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label={messages.nav.backToTop}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={cn(
        'bg-background text-foreground ring-border hover:text-primary hover:ring-primary/40 shadow-dropdown fixed right-5 bottom-20 z-40 flex size-11 items-center justify-center rounded-full ring-1 transition-all duration-300',
        visible ? 'opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
      )}
    >
      <ArrowUpIcon className="size-5" />
    </button>
  );
}

export default ScrollToTop;
