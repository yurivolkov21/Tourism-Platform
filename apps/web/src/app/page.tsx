import { Hero } from '../components/marketing/hero';
import { TechCloud } from '../components/marketing/tech-cloud';
import { Destinations } from '../components/marketing/destinations';
import { Experiences } from '../components/marketing/experiences';
import { FeaturedPackages } from '../components/marketing/featured-packages';
import { WhyChoose } from '../components/marketing/why-choose';
import { Trust } from '../components/marketing/trust';
import { BlogTeaser } from '../components/marketing/blog-teaser';
import { EnquiryCta } from '../components/marketing/enquiry-cta';
import { Reveal } from '../components/marketing/reveal';
import { fetchTourCards } from '../lib/api/tours';
import {
  fetchDestinationTiles,
  fetchTourDestinationCounts,
} from '../lib/api/destinations';
import { fetchPosts } from '../lib/api/posts';
import { pickHomeBento } from '../lib/home-bento';
import { applyTourCounts } from '../lib/destination-counts';
import { messages } from '@tourism/i18n';

// ISR: render real featured tours + destination tiles statically; fall back to
// empty (section hidden) on an API error/cold-start so the home never looks broken.
export const revalidate = 300;

export default async function HomePage() {
  const [featured, tiles, counts, posts] = await Promise.all([
    fetchTourCards({ featured: true }).catch(() => []),
    fetchDestinationTiles().catch(() => []),
    fetchTourDestinationCounts().catch(() => ({})),
    fetchPosts({ pageSize: 3 })
      .then((page) => page.posts)
      .catch(() => []),
  ]);
  const bento = applyTourCounts(pickHomeBento(tiles), counts);

  return (
    <main>
      {/* Hero stays static (above the fold); below-fold sections rise in on scroll */}
      <Hero />
      {/* Coloured "built with" tech-stack marquee — breather between hero + below */}
      <TechCloud />
      {bento.length > 0 && (
        <Reveal>
          <Destinations tiles={bento} />
        </Reveal>
      )}
      <Reveal>
        <Experiences />
      </Reveal>
      {featured.length > 0 && (
        <Reveal>
          <FeaturedPackages tours={featured} />
        </Reveal>
      )}
      {/* WhyChoose staggers its own cards on view (no section-level reveal) */}
      <WhyChoose />
      <Reveal>
        <Trust />
      </Reveal>
      <Reveal>
        <BlogTeaser posts={posts} />
      </Reveal>
      <Reveal>
        <EnquiryCta heading={messages.enquiryCta.headings.home} />
      </Reveal>
    </main>
  );
}
