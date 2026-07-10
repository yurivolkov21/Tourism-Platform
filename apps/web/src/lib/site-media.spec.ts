import { siteGallery, siteImage, type SiteMediaMap } from './site-media';

const MAP: SiteMediaMap = {
  'home-hero': [{ url: 'https://cdn/managed-hero.jpg' }],
  'about-story': [
    { url: 'https://cdn/story-1.jpg' },
    { url: 'https://cdn/story-2.jpg' },
  ],
  'empty-slot': [],
};

describe('siteImage', () => {
  it('returns the managed url when the slot has one', () => {
    expect(siteImage(MAP, 'home-hero', 'https://fallback.jpg')).toBe(
      'https://cdn/managed-hero.jpg',
    );
  });

  it('falls back when the slot is missing or empty', () => {
    expect(siteImage(MAP, 'cta-band', 'https://fallback.jpg')).toBe(
      'https://fallback.jpg',
    );
    expect(siteImage(MAP, 'empty-slot', 'https://fallback.jpg')).toBe(
      'https://fallback.jpg',
    );
    expect(siteImage({}, 'home-hero', 'https://fallback.jpg')).toBe(
      'https://fallback.jpg',
    );
  });
});

describe('siteGallery (all-real-or-fixture)', () => {
  const fallbacks = ['https://f1.jpg', 'https://f2.jpg', 'https://f3.jpg'];

  it('returns ONLY the managed set when non-empty (even if shorter than the fixture)', () => {
    expect(siteGallery(MAP, 'about-story', fallbacks)).toEqual([
      'https://cdn/story-1.jpg',
      'https://cdn/story-2.jpg',
    ]);
  });

  it('returns the full fixture set when the slot is missing or empty', () => {
    expect(siteGallery(MAP, 'empty-slot', fallbacks)).toEqual(fallbacks);
    expect(siteGallery({}, 'about-story', fallbacks)).toEqual(fallbacks);
  });
});
