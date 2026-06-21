import { Hero } from '../components/marketing/hero';
import { Destinations } from '../components/marketing/destinations';
import { Experiences } from '../components/marketing/experiences';
import { FeaturedPackages } from '../components/marketing/featured-packages';
import { WhyChoose } from '../components/marketing/why-choose';
import { Trust } from '../components/marketing/trust';
import { BlogTeaser } from '../components/marketing/blog-teaser';
import { EnquiryCta } from '../components/marketing/enquiry-cta';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Destinations />
      <Experiences />
      <FeaturedPackages />
      <WhyChoose />
      <Trust />
      <BlogTeaser />
      <EnquiryCta />
    </>
  );
}
