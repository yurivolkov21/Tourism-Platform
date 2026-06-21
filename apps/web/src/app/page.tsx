import { SiteHeader } from '../components/layout/site-header';
import { SiteFooter } from '../components/layout/site-footer';
import { Hero } from '../components/marketing/hero';
import { Destinations } from '../components/marketing/destinations';
import { Features } from '../components/marketing/features';
import { Trust } from '../components/marketing/trust';
import { EnquiryCta } from '../components/marketing/enquiry-cta';

export default function HomePage() {
  return (
    <div className="relative">
      <SiteHeader />
      <main className="flex flex-col">
        <Hero />
        <Destinations />
        <Features />
        <Trust />
        <EnquiryCta />
      </main>
      <SiteFooter />
    </div>
  );
}
