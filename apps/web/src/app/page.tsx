import { Hero } from '../components/marketing/hero';
import { Destinations } from '../components/marketing/destinations';
import { Experiences } from '../components/marketing/experiences';
import { FeaturedPackages } from '../components/marketing/featured-packages';
import { WhyChoose } from '../components/marketing/why-choose';
import { Trust } from '../components/marketing/trust';
import { BlogTeaser } from '../components/marketing/blog-teaser';
import { EnquiryCta } from '../components/marketing/enquiry-cta';
import { Reveal } from '../components/marketing/reveal';
import { messages } from '@tourism/i18n';

export default function HomePage() {
  return (
    <>
      {/* Hero stays static (above the fold); below-fold sections rise in on scroll */}
      <Hero />
      <Reveal>
        <Destinations />
      </Reveal>
      <Reveal>
        <Experiences />
      </Reveal>
      <Reveal>
        <FeaturedPackages />
      </Reveal>
      {/* WhyChoose staggers its own cards on view (no section-level reveal) */}
      <WhyChoose />
      <Reveal>
        <Trust />
      </Reveal>
      <Reveal>
        <BlogTeaser />
      </Reveal>
      <Reveal>
        <EnquiryCta heading={messages.enquiryCta.headings.home} />
      </Reveal>
    </>
  );
}
