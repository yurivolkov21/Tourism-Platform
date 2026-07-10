'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SPINE_BASE =
  'pointer-events-none absolute top-3 bottom-3 left-1/2 hidden w-0.5 -translate-x-1/2 rounded-full lg:block';

/**
 * Desktop centre spine for the About "Our story" timeline. The faded track is always rendered
 * (so it reads as a spine without JS), and a brighter emerald fill scrubs from top to bottom as
 * the timeline scrolls through the viewport. Under reduced-motion the fill is shown complete.
 */
export function StorySpine() {
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { scaleY: 1 });
      return;
    }

    const ol = el.parentElement;
    if (!ol) return;
    const scroller =
      document.getElementById('snap-main-container') || undefined;

    gsap.set(el, { scaleY: 0, transformOrigin: 'top center' });
    const st = ScrollTrigger.create({
      trigger: ol,
      scroller,
      start: 'top 75%',
      end: 'bottom 60%',
      scrub: true,
      onUpdate: (self) => gsap.set(el, { scaleY: self.progress }),
    });

    return () => st.kill();
  }, []);

  return (
    <>
      <span aria-hidden className={`${SPINE_BASE} bg-primary/15`} />
      <span
        ref={fillRef}
        aria-hidden
        className={`${SPINE_BASE} from-primary/60 to-primary/30 bg-linear-to-b`}
      />
    </>
  );
}

export default StorySpine;
