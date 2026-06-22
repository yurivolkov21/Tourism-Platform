import { Tile } from '../marketing/gallery';

/** Region photo gallery — a clean uniform grid (clearly divided, equal tiles). */
export function RegionGallery({
  heading,
  subtitle,
  images,
}: {
  heading: string;
  subtitle: string;
  images: string[];
}) {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-14">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{heading}</h2>
          <p className="text-muted-foreground text-lg text-pretty">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((src, i) => (
            <Tile key={i} image={{ src, alt: heading }} className="aspect-4/3" />
          ))}
        </div>
      </div>
    </section>
  );
}

export default RegionGallery;
