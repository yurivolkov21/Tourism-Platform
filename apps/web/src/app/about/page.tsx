import type { Metadata } from 'next';

import { AboutHero } from '../../components/about/about-hero';
import { Story } from '../../components/about/story';
import { ByTheNumbers } from '../../components/about/by-the-numbers';
import { Team } from '../../components/about/team';
import { EnquiryCta } from '../../components/marketing/enquiry-cta';
import { messages } from '@tourism/i18n';

export const metadata: Metadata = {
  title: 'About us — Tourism Platform',
  description:
    'Meet the local experts behind our boutique heritage journeys across Vietnam — our story, the numbers behind the trips, and the guides who craft them.',
};

export default function AboutPage() {
  return (
    <main>
      <AboutHero />
      <Story />
      <ByTheNumbers />
      <Team />
      <EnquiryCta heading={messages.enquiryCta.headings.about} />
    </main>
  );
}
