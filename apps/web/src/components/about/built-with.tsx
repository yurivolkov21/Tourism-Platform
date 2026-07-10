import { messages } from '@tourism/i18n';

import { Reveal } from '../marketing/reveal';
import { TechMarquee } from '../marketing/tech-marquee';

/**
 * "Built with" logo cloud — the Testimonial-02 brand strip repurposed honestly as
 * the project's real tech stack (no fabricated partner logos).
 */
export function BuiltWith() {
  const t = messages.about.builtWith;

  return (
    <section className="pb-16 sm:pb-20 lg:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="border-border flex flex-col gap-6 border-t pt-12">
            <p className="text-muted-foreground text-center text-base">
              {t.caption}
            </p>
            <TechMarquee />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default BuiltWith;
