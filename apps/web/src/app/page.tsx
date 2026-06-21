import { SiteHeader } from '../components/layout/site-header';
import { Hero } from '../components/marketing/hero';

export default function HomePage() {
  return (
    <div className="relative">
      <SiteHeader />
      <main className="flex flex-col">
        <Hero />
      </main>
    </div>
  );
}
