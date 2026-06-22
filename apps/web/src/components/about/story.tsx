import { messages } from '@tourism/i18n';

// About-page "Our story" — a vertical milestone timeline. Repurposed from a software
// changelog block; the code/accordion/logo machinery (and its dangerouslySetInnerHTML
// syntax highlighter) is intentionally dropped.
export function Story() {
  const t = messages.about.story;

  return (
    <section id="story" className="scroll-mt-20 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 space-y-4 text-center sm:mb-16">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
          <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
        </div>

        <ol className="border-border relative ml-3 space-y-10 border-l">
          {t.milestones.map((m) => (
            <li key={m.year} className="relative pl-8">
              {/* Node */}
              <span className="bg-primary/20 absolute top-1 -left-2.25 flex size-4.5 items-center justify-center rounded-full">
                <span className="bg-primary size-2.5 rounded-full" />
              </span>
              <p className="text-primary font-heading text-2xl leading-none font-bold">{m.year}</p>
              <h3 className="font-sans mt-2 text-lg font-semibold">{m.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-pretty">{m.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default Story;
