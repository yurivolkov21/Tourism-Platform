import Image from 'next/image';

import type { DestinationTileVM } from '../../lib/destinations.fixtures';

/** Detail intro: editorial copy on the left, a supporting image set on the right. */
export function DestinationIntro({ destination: d }: { destination: DestinationTileVM }) {
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
        <div className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold text-balance md:text-3xl">{d.name}</h2>
          <p className="text-muted-foreground text-lg text-pretty">{d.intro}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {d.gallery.map((src, i) => (
            <div
              key={src}
              className={`relative overflow-hidden rounded-xl ${
                i === 0 ? 'col-span-2 aspect-16/9' : 'aspect-square'
              }`}
            >
              <Image
                src={src}
                alt={`${d.name} ${i + 1}`}
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DestinationIntro;
