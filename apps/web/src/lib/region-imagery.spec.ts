import {
  deriveRegionImagery,
  deriveOverviewGallery,
  fillTo,
} from './region-imagery';

describe('fillTo', () => {
  it('cycles urls to reach n', () => {
    expect(fillTo(['a', 'b'], 5)).toEqual(['a', 'b', 'a', 'b', 'a']);
  });
  it('returns [] for empty input', () => {
    expect(fillTo([], 5)).toEqual([]);
  });
});

describe('deriveRegionImagery', () => {
  const fixture = {
    image: 'fx',
    images: ['fx1', 'fx2'],
    gallery: ['g0', 'g1', 'g2'],
  };

  it('returns the fixture unchanged when no destination has real media', () => {
    expect(
      deriveRegionImagery([{ gallery: [] }, { gallery: [] }], fixture),
    ).toEqual(fixture);
  });

  it('derives from real media (deduped), filling the gallery to the fixture length', () => {
    const tiles = [{ gallery: ['r1', 'r2'] }, { gallery: ['r2', 'r3'] }];
    const out = deriveRegionImagery(tiles, fixture);
    expect(out.image).toBe('r1');
    expect(out.images).toEqual(['r1', 'r2', 'r3']);
    expect(out.gallery).toEqual(['r1', 'r2', 'r3']); // fillTo(3 urls, gallery length 3)
  });
});

describe('deriveOverviewGallery', () => {
  const frames = [{ images: [{ alt: 'a' }, { alt: 'b' }] }];

  it('returns the placeholder frames when no real media', () => {
    expect(deriveOverviewGallery([{ gallery: [] }], frames)).toEqual(frames);
  });

  it('fills srcs from real media, keeping the frame alts', () => {
    const out = deriveOverviewGallery(
      [{ gallery: ['r1', 'r2', 'r3'] }],
      frames,
    );
    expect(out).toEqual([
      {
        images: [
          { src: 'r1', alt: 'a' },
          { src: 'r2', alt: 'b' },
        ],
      },
    ]);
  });
});
