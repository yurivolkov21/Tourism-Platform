'use client';

import { useState, type ComponentPropsWithoutRef } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

/**
 * Markdown → styled elements for an itinerary day's body. Scoped classes (no typography plugin) keep
 * the bundle lean and the rendering on-brand. Raw HTML is NOT enabled (no `rehype-raw`), so authored
 * content can't inject scripts.
 */
const MD_COMPONENTS: Components = {
  p: (props) => <p className="text-muted-foreground mb-3 leading-relaxed text-pretty last:mb-0" {...props} />,
  strong: (props) => <strong className="text-foreground font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  ul: (props) => <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0" {...props} />,
  ol: (props) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0" {...props} />,
  li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
    <li className="text-muted-foreground marker:text-primary/60 leading-relaxed text-pretty" {...props}>
      {children}
    </li>
  ),
  h3: (props) => <h3 className="font-heading text-foreground mt-4 mb-1.5 text-lg font-semibold first:mt-0" {...props} />,
  h4: (props) => <h4 className="text-foreground mt-3 mb-1 font-semibold first:mt-0" {...props} />,
  a: (props) => <a className="text-primary font-medium hover:underline" {...props} />,
  hr: () => <hr className="border-border/60 my-4" />,
};

/** Day-by-day itinerary as a vertical stepper: numbered day-nav on the left, the selected day's
 * markdown content in the panel with Back / Next. The day `body` is authored as Markdown (headings,
 * bold, bullets, paragraphs) so each day reads as a structured mini-document. */
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
                <h3 className="font-heading mt-1 mb-4 text-xl font-semibold text-balance">
                  {step.description}
                </h3>
                <div className="min-w-0 text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                    {days[index]?.body ?? ''}
                  </ReactMarkdown>
                </div>

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
