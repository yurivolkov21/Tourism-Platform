import { ArrowRightIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';

// Reusable end-of-page CTA — horizontal (copy left, action right) in a contained emerald
// panel. Distinct from the homepage EnquiryCta (full-bleed, centered). Prop-driven so each
// page supplies its own copy from @tourism/i18n.
export type CtaBandProps = {
  heading: string;
  subtitle: string;
  cta: { label: string; href: string };
};

export function CtaBand({ heading, subtitle, cta }: CtaBandProps) {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-primary flex flex-col gap-6 rounded-2xl px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:py-12">
          <div className="space-y-3">
            <h2 className="text-primary-foreground text-2xl font-semibold text-balance md:text-3xl">
              {heading}
            </h2>
            <p className="text-primary-foreground/80 text-lg text-pretty">{subtitle}</p>
          </div>
          <a
            href={cta.href}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'bg-background text-foreground hover:bg-background/90 shrink-0',
            )}
          >
            {cta.label}
            <ArrowRightIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

export default CtaBand;
