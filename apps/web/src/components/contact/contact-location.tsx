'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpRightIcon, Clock8Icon, MapPinIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { SectionHeading } from '../section-heading';

// MapLibre is heavy + WebGL/client-only → load it in a lazy chunk, skip SSR.
const ContactMap = dynamic(() => import('./contact-map'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return <div className="bg-muted size-full animate-pulse" aria-hidden />;
}

/**
 * "Where we're based" — a full-bleed Hà Nội map (mapcn) with a floating glass
 * info card overlaid. The map only mounts once the section scrolls into view
 * (IntersectionObserver), so its chunk never loads for visitors who don't reach it.
 */
export function ContactLocation() {
  const t = messages.contact;
  const offices = t.offices;
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  return (
    <section className="bg-muted py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title={t.officesHeading}
          subtitle={t.officesSubtitle}
          align="left"
          className="mb-10 space-y-4 sm:mb-14"
        />

        {/* Full-bleed map */}
        <div
          ref={ref}
          className="ring-border relative h-90 overflow-hidden rounded-2xl ring-1 sm:h-110"
        >
          {inView ? <ContactMap /> : <MapSkeleton />}
        </div>

        {/* Office cards — one per location */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {offices.map((office) => (
            <div
              key={office.city}
              className="bg-background ring-border shadow-card rounded-xl p-5 ring-1 sm:p-6"
            >
              <h3 className="font-heading text-xl font-semibold">
                {office.city}
              </h3>
              <div className="mt-3 space-y-3 text-sm">
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
                className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
              >
                {t.getDirections}
                <ArrowUpRightIcon className="size-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ContactLocation;
