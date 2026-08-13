import { BackpackIcon, MailIcon, MapPinIcon } from 'lucide-react';

import { Card, CardContent } from '@tourism/ui';
import { messages } from '@tourism/i18n';

/** Static pre-trip prep — packing list + support are always-on copy; the meeting-point line uses the
 * tour's real `meetingPoint` when the API has one, else an honest fallback (never fabricates a
 * location). Unlike `TripHighlights`/`TripInclusions`, this section always renders — it's the one
 * guaranteed-present block even when the tour lookup failed (`meetingPoint` is then `undefined`). */
export function BeforeYouGo({
  meetingPoint,
}: {
  meetingPoint?: string | null;
}) {
  const t = messages.booking.success.beforeYouGo;

  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <h2 className="font-heading text-xl font-semibold">{t.heading}</h2>

        <div className="flex items-start gap-3">
          <BackpackIcon
            className="text-primary mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t.packingHeading}
            </div>
            <ul className="mt-2 space-y-1.5">
              {t.packingItems.map((item) => (
                <li key={item} className="text-sm text-pretty">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPinIcon
            className="text-primary mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t.meetingHeading}
            </div>
            <p className="mt-1 text-sm text-pretty">
              {meetingPoint || t.meetingFallback}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MailIcon
            className="text-primary mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t.supportHeading}
            </div>
            <p className="mt-1 text-sm text-pretty">{t.supportBody}</p>
            <a
              href={`mailto:${messages.footer.email}`}
              className="text-primary mt-1 inline-block text-sm font-medium hover:underline"
            >
              {messages.footer.email}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BeforeYouGo;
