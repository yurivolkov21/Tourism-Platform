import { messages } from '@tourism/i18n';

import { Logo } from '../brand/logo';

/**
 * A calm ivory "brand interlude" — the Nexora lockup + tagline between two
 * hairlines. Sits just below the hero to give a breather between the image-led
 * hero and the sections that follow (which can also be image-backed), and to
 * reinforce the brand once near the top of the page.
 */
export function BrandInterlude() {
  return (
    <section className="bg-background border-border/60 border-y">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-11 text-center sm:px-6 sm:py-14 lg:px-8">
        <Logo className="origin-center scale-110 sm:scale-125" />
        <div className="text-muted-foreground flex items-center gap-3">
          <span className="bg-border h-px w-8 sm:w-12" aria-hidden />
          <p className="font-heading text-sm tracking-wide text-pretty italic sm:text-base">
            {messages.brand.tagline}
          </p>
          <span className="bg-border h-px w-8 sm:w-12" aria-hidden />
        </div>
      </div>
    </section>
  );
}

export default BrandInterlude;
