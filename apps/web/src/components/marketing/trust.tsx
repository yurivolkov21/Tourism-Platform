import { messages } from '@tourism/i18n';

export function Trust() {
  const t = messages.trust;

  return (
    <section className="bg-muted py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xl font-semibold text-balance sm:text-2xl">{t.heading}</h2>
        <dl className="mt-10 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {t.stats.map((s) => (
            <div key={s.label} className="text-center">
              <dt className="text-primary font-heading text-4xl font-bold sm:text-5xl">{s.value}</dt>
              <dd className="text-muted-foreground mt-2 text-sm">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default Trust;
