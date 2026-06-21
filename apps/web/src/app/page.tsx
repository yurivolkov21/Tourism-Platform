import { SiteHeader } from '../components/layout/site-header';
import { Hero } from '../components/marketing/hero';
import { Destinations } from '../components/marketing/destinations';
import { Features } from '../components/marketing/features';

export default function HomePage() {
  return (
    <div className="relative">
      <SiteHeader />
      <main className="flex flex-col">
        <Hero />
        <Destinations />
        <Features />
      </main>
    </div>
  );
}
