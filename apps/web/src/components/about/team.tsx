import { Card, CardContent, Separator } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { FacebookIcon, InstagramIcon, TwitterIcon } from '../icons/social';

// First-letter initials from the first two name parts (e.g. "Linh Nguyễn" → "LN").
function initials(name: string): string {
  return name
    .split(' ', 2)
    .map((part) => part[0])
    .join('');
}

const socialLinks = [
  { Icon: FacebookIcon, label: 'Facebook' },
  { Icon: InstagramIcon, label: 'Instagram' },
  { Icon: TwitterIcon, label: 'X' },
];

// About-page team / "meet your guides" grid. Portrait images aren't in the schema yet,
// so each card uses an initials portrait placeholder on a muted top band.
export function Team() {
  const t = messages.about.team;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
          <p className="text-muted-foreground mt-4 text-lg text-pretty">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-10">
          {t.members.map((member) => (
            <Card
              key={member.name}
              className="overflow-hidden pt-0 transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-card hover:ring-primary/40"
            >
              {/* Portrait placeholder — initials on a muted band */}
              <div className="bg-muted flex justify-center pt-10 pb-8">
                <span className="bg-primary/10 text-primary font-heading flex size-28 items-center justify-center rounded-full text-3xl font-semibold">
                  {initials(member.name)}
                </span>
              </div>

              <CardContent className="space-y-3">
                <h3 className="font-sans text-lg font-semibold">{member.name}</h3>
                <Separator />
                <div>
                  <p className="text-primary mb-1 font-medium">{member.role}</p>
                  <p className="text-muted-foreground text-sm text-pretty">{member.bio}</p>
                </div>
                <div className="flex gap-1 pt-1">
                  {socialLinks.map(({ Icon, label }) => (
                    <a
                      key={label}
                      href="#"
                      aria-label={`${member.name} on ${label}`}
                      className="text-muted-foreground hover:text-primary hover:bg-muted flex size-9 items-center justify-center rounded-full transition-colors"
                    >
                      <Icon className="size-5" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Team;
