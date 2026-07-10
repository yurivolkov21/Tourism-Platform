'use client';

import { QuoteIcon } from 'lucide-react';

import {
  Badge,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { Reveal } from '../marketing/reveal';

// First + last name initials (e.g. "Giang Tử Dương" → "GD").
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * About-page team showcase — faithfully laid out after the Shadcn Space "Testimonial 02"
 * block (left-aligned badge + heading, nav arrows top-right; one member per slide: a large
 * bio with a quote mark, the name + role, and a portrait column). Brand-tokenized, built on
 * `@tourism/ui` Carousel; no portrait photos yet → an initials avatar fills the portrait.
 */
export function Team() {
  const t = messages.about.team;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <Carousel opts={{ loop: true }} className="w-full">
            {/* Header row: badge + heading (left), nav arrows (top-right) */}
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-3">
                <Badge className="w-fit border-0 px-3 py-1 text-sm">
                  {t.eyebrow}
                </Badge>
                <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                  {t.heading}
                </h2>
              </div>
              <div className="flex shrink-0 gap-2">
                <CarouselPrevious className="static size-9 translate-x-0 translate-y-0" />
                <CarouselNext className="static size-9 translate-x-0 translate-y-0" />
              </div>
            </div>

            <CarouselContent className="pt-12">
              {t.members.map((member) => (
                <CarouselItem key={member.name}>
                  <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-6">
                    {/* Bio + name + role */}
                    <div className="order-2 flex flex-col gap-8 sm:flex-row sm:gap-10 lg:order-1 lg:col-span-8 lg:pe-12">
                      <QuoteIcon
                        className="text-muted-foreground/30 size-10 shrink-0"
                        aria-hidden
                      />
                      <div className="flex flex-col gap-10">
                        <p className="text-muted-foreground text-xl text-pretty sm:text-3xl sm:leading-snug">
                          {member.bio}
                        </p>
                        <div>
                          <p className="text-base font-semibold">
                            {member.name}
                          </p>
                          <p className="text-primary text-sm font-medium">
                            {member.role}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Portrait — real image when available, else an initials avatar */}
                    <div className="order-1 lg:order-2 lg:col-span-4">
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          className="aspect-square w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div
                          aria-hidden
                          className="bg-primary/10 text-primary font-heading ring-primary/15 flex aspect-square w-full items-center justify-center rounded-xl text-6xl font-semibold ring-1"
                        >
                          {initials(member.name)}
                        </div>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </Reveal>
      </div>
    </section>
  );
}

export default Team;
