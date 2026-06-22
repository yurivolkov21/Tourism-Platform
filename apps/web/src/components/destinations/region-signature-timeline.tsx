/**
 * Heritage signature (Central Vietnam) — an editorial timeline of heritage stops on a light band,
 * distinct in structure from the dark adventure-stats band and the image+text default. Brass accent.
 */
export function RegionSignatureTimeline({
  eyebrow,
  heading,
  body,
  timeline,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  timeline: { title: string; era: string; body: string }[];
}) {
  return (
    <section className="bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-4">
          <span className="text-rating text-xs font-semibold tracking-widest uppercase">
            {eyebrow}
          </span>
          <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl">
            {heading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">{body}</p>
        </div>

        <ol className="mt-14 grid gap-12 sm:mt-20 sm:grid-cols-3 sm:gap-8">
          {timeline.map((stop, i) => (
            <li key={stop.title} className="border-rating/30 relative border-t pt-9">
              <span className="text-rating border-rating bg-background font-heading absolute -top-4 left-0 flex size-8 items-center justify-center rounded-full border text-sm font-bold">
                {i + 1}
              </span>
              <span className="text-rating text-xs font-semibold tracking-widest uppercase">
                {stop.era}
              </span>
              <h3 className="font-heading mt-1 text-2xl font-semibold">{stop.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm text-pretty">{stop.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default RegionSignatureTimeline;
