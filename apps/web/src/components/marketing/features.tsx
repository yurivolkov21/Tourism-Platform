import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CompassIcon,
  LifeBuoyIcon,
  ShieldCheckIcon,
  StarIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Index-aligned with messages.features.items. Multi-color via semantic tokens (not raw rainbow).
const featureStyles: {
  icon: LucideIcon;
  fg: string;
  bg: string;
  hover: string;
}[] = [
  {
    icon: CompassIcon,
    fg: 'text-primary',
    bg: 'bg-primary/10',
    hover: 'hover:border-primary/50',
  },
  {
    icon: ShieldCheckIcon,
    fg: 'text-success',
    bg: 'bg-success/10',
    hover: 'hover:border-success/50',
  },
  {
    icon: UsersIcon,
    fg: 'text-rating',
    bg: 'bg-rating/10',
    hover: 'hover:border-rating/50',
  },
  {
    icon: StarIcon,
    fg: 'text-info',
    bg: 'bg-info/10',
    hover: 'hover:border-info/50',
  },
  {
    icon: CalendarCheckIcon,
    fg: 'text-primary',
    bg: 'bg-primary/10',
    hover: 'hover:border-primary/50',
  },
  {
    icon: LifeBuoyIcon,
    fg: 'text-rating',
    bg: 'bg-rating/10',
    hover: 'hover:border-rating/50',
  },
];

export function Features() {
  const t = messages.features;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 space-y-4 sm:mb-16">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
            {t.heading}
          </h2>
          <p className="text-muted-foreground max-w-2xl text-lg text-pretty">
            {t.subtitle}
          </p>
          <Button
            variant="outline"
            size="lg"
            render={<a href="/tours" />}
            nativeButton={false}
          >
            {t.cta}
            <ArrowRightIcon />
          </Button>
        </div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.items.map((item, index) => {
            const style = featureStyles[index % featureStyles.length];
            const Icon = style.icon;

            return (
              <Card
                key={item.title}
                className={cn(
                  'border-border transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:shadow-dropdown',
                  style.hover,
                )}
              >
                <CardContent>
                  <Avatar size="lg" className="mb-6 rounded-md after:border-0">
                    <AvatarFallback
                      className={cn(
                        'rounded-md [&>svg]:size-6',
                        style.bg,
                        style.fg,
                      )}
                    >
                      <Icon />
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="mb-2 font-sans text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Features;
