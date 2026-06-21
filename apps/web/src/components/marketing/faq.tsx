import { Badge, Card, CardContent, buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Two-column FAQ: intro on the left, stacked question cards on the right.
// Motion (the reference used motion/react) is deferred to the dedicated motion pass.
export function Faq() {
  const t = messages.faq;

  return (
    <section className="bg-muted py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Intro */}
          <div className="space-y-4">
            <Badge variant="outline" className="font-normal">
              {t.eyebrow}
            </Badge>
            <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
              {t.heading}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed text-pretty">{t.subtitle}</p>
          </div>

          {/* Questions */}
          <div className="space-y-5 lg:max-w-[90%] lg:justify-self-end">
            {t.items.map((item) => (
              <Card key={item.question} className="transition-shadow duration-300 hover:shadow-card">
                <CardContent className="space-y-3">
                  <h3 className="font-sans text-lg font-medium">{item.question}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                </CardContent>
              </Card>
            ))}

            <a href="#" className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'px-0')}>
              {t.seeAll}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Faq;
