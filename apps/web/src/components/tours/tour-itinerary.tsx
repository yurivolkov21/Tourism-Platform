'use client';

import { useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

import {
  Button,
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { TourSection } from './tour-section';
import type { ItineraryDay } from '../../lib/tours';
import { parseItinerary } from '../../lib/itinerary';

/** Day-by-day itinerary as a vertical stepper (verbatim from the playground demo, data-bound to the
 * tour's days): numbered day-nav on the left, the selected day's detail in the panel with Back / Next. */
export function TourItinerary({ days }: { days: ItineraryDay[] }) {
  const t = messages.tourDetail;
  const steps = days.map((day) => ({
    id: `day-${day.day}`,
    title: t.dayLabel(day.day),
    description: day.title,
  }));

  const [current, setCurrent] = useState(steps[0]?.id ?? '');
  const currentIndex = steps.findIndex((s) => s.id === current);
  const goNext = () => setCurrent(steps[Math.min(currentIndex + 1, steps.length - 1)].id);
  const goBack = () => setCurrent(steps[Math.max(currentIndex - 1, 0)].id);

  return (
    <TourSection title={t.itinerary}>
      <Stepper
        steps={steps}
        value={current}
        onValueChange={setCurrent}
        className="flex flex-col gap-8 lg:flex-row lg:items-start"
        orientation="vertical"
      >
        <StepperNav className="w-60 shrink-0">
          {steps.map((step, index) => (
            <StepperItem key={step.id} stepId={step.id} className="relative items-start">
              <StepperTrigger className="items-start gap-2.5 pb-15 last:pb-0">
                <StepperIndicator>{index + 1}</StepperIndicator>
                <div className="text-left">
                  <StepperTitle>{step.title}</StepperTitle>
                  <StepperDescription>{step.description}</StepperDescription>
                </div>
              </StepperTrigger>
              {index < steps.length - 1 && (
                <StepperSeparator className="absolute inset-y-0 top-[calc(50%-8px)] left-2 group-data-[orientation=vertical]/stepper-nav:h-8" />
              )}
            </StepperItem>
          ))}
        </StepperNav>

        <StepperPanel className="min-w-0 flex-1">
          {steps.map((step, index) => (
            <StepperContent key={step.id} value={step.id}>
              <div className="border-border/60 bg-muted/30 flex min-h-full flex-col rounded-xl border p-5 sm:p-6">
                <span className="text-primary font-sans text-xs font-bold tracking-wide uppercase">
                  {step.title}
                </span>
                <h3 className="font-heading mt-1 text-xl font-semibold text-balance">
                  {step.description}
                </h3>
                <ul className="mt-4 space-y-3">
                  {parseItinerary(days[index]?.body ?? '').map((m, i) => (
                    <li key={i} className="flex gap-3 text-pretty sm:gap-4">
                      {m.time ? (
                        <span className="text-primary w-24 shrink-0 text-sm font-semibold tabular-nums">
                          {m.time}
                        </span>
                      ) : null}
                      <span className="text-muted-foreground leading-relaxed">{m.text}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex items-center justify-between gap-3 pt-2">
                  <Button
                    onClick={goBack}
                    disabled={currentIndex === 0}
                    variant={currentIndex === 0 ? 'secondary' : 'default'}
                  >
                    <ArrowLeftIcon className="size-4" /> {t.stepBack}
                  </Button>

                  <Button
                    onClick={goNext}
                    disabled={currentIndex === steps.length - 1}
                    variant={currentIndex === steps.length - 1 ? 'secondary' : 'default'}
                  >
                    {t.stepNext} <ArrowRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </StepperContent>
          ))}
        </StepperPanel>
      </Stepper>
    </TourSection>
  );
}

export default TourItinerary;
