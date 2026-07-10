import {
  CloudSunIcon,
  FileCheckIcon,
  PlaneIcon,
  ShieldCheckIcon,
  WalletIcon,
  WifiIcon,
  type LucideIcon,
} from 'lucide-react';

import { messages } from '@tourism/i18n';

// Icons in catalogue order (visas / money / getting around / connectivity / safety / packing).
const TIP_ICONS: readonly LucideIcon[] = [
  FileCheckIcon,
  WalletIcon,
  PlaneIcon,
  WifiIcon,
  ShieldCheckIcon,
  CloudSunIcon,
];

/** "Know before you go" — practical Vietnam travel tips, unique to the destinations page. */
export function TravelTips() {
  const t = messages.travelTips;

  return (
    <section className="bg-muted/40 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-12">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
            {t.heading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">
            {t.subtitle}
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {t.items.map((item, i) => {
            const Icon = TIP_ICONS[i] ?? FileCheckIcon;
            return (
              <div key={item.title} className="flex gap-4">
                <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground mt-1 text-pretty">
                    {item.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default TravelTips;
