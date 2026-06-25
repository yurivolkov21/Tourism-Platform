'use client';

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
 * About-page team showcase — a one-member-per-slide carousel (adapted from the Shadcn Space
 * "Testimonial 02" block): a large bio, the member's name + role, and a portrait column.
 * No portrait photos yet → an initials avatar fills the portrait; a real `image` drops in later.
 */
export function Team() {
  const t = messages.about.team;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
            <Badge className="mb-3 border-0 px-3 py-1 text-sm">{t.eyebrow}</Badge>
            <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
            <p className="text-muted-foreground mt-4 text-lg text-pretty">{t.subtitle}</p>
          </div>
        </Reveal>

        <Reveal>
          <Carousel opts={{ loop: true }} className="w-full">
            <CarouselContent>
              {t.members.map((member) => (
                <CarouselItem key={member.name}>
                  <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto] sm:gap-12">
                    {/* Bio + name + role */}
                    <div className="order-2 flex flex-col gap-8 sm:order-1">
                      <blockquote className="font-heading text-2xl leading-snug text-balance sm:text-3xl">
                        “{member.bio}”
                      </blockquote>
                      <div>
                        <p className="text-lg font-semibold">{member.name}</p>
                        <p className="text-primary font-medium">{member.role}</p>
                      </div>
                    </div>

                    {/* Portrait — real image when available, else an initials avatar */}
                    <div className="order-1 sm:order-2">
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          className="ring-border size-48 rounded-2xl object-cover ring-1 sm:size-60"
                        />
                      ) : (
                        <div
                          aria-hidden
                          className="bg-primary/10 text-primary font-heading ring-primary/15 flex size-48 items-center justify-center rounded-2xl text-5xl font-semibold ring-4 sm:size-60"
                        >
                          {initials(member.name)}
                        </div>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            <div className="mt-8 flex justify-center gap-3 sm:justify-end">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </Reveal>
      </div>
    </section>
  );
}

export default Team;
