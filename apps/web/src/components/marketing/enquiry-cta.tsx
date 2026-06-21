import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

export function EnquiryCta() {
  const t = messages.enquiryCta;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="from-primary to-primary/80 overflow-hidden rounded-2xl bg-linear-to-br px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="text-primary-foreground mx-auto flex max-w-2xl flex-col items-center gap-5">
            <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">{t.heading}</h2>
            <p className="text-primary-foreground/85 text-lg text-pretty">{t.subtitle}</p>
            <a
              href="#contact"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'bg-background text-foreground hover:bg-background/90 border-transparent',
              )}
            >
              {t.cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EnquiryCta;
