import { MediaType } from '@prisma/client';
import { buildCloudinaryUrl } from './cloudinary-url';

const CLOUD = 'demo';

describe('buildCloudinaryUrl', () => {
  it('builds an image URL with f_auto,q_auto and no poster', () => {
    const res = buildCloudinaryUrl(CLOUD, {
      type: MediaType.IMAGE,
      publicId: 'tourism/tours/hero/hoi-an',
    });
    expect(res.url).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/tourism/tours/hero/hoi-an',
    );
    expect(res.posterUrl).toBeUndefined();
  });

  it('builds a video URL with a derived first-frame poster', () => {
    const res = buildCloudinaryUrl(CLOUD, {
      type: MediaType.VIDEO,
      publicId: 'tourism/tours/video/clip',
    });
    expect(res.url).toBe(
      'https://res.cloudinary.com/demo/video/upload/tourism/tours/video/clip',
    );
    expect(res.posterUrl).toBe(
      'https://res.cloudinary.com/demo/video/upload/so_0/tourism/tours/video/clip.jpg',
    );
  });

  it('uses a dedicated posterId image when provided', () => {
    const res = buildCloudinaryUrl(CLOUD, {
      type: MediaType.VIDEO,
      publicId: 'tourism/tours/video/clip',
      posterId: 'tourism/tours/video/poster',
    });
    expect(res.posterUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/tourism/tours/video/poster',
    );
  });

  it('passes through an absolute http(s) publicId unchanged (placeholder/seed imagery)', () => {
    const remote =
      'https://images.unsplash.com/photo-1528127269322-539801943592?w=1100&q=70';
    const res = buildCloudinaryUrl(CLOUD, {
      type: MediaType.IMAGE,
      publicId: remote,
    });
    expect(res.url).toBe(remote);
    expect(res.posterUrl).toBeUndefined();
  });

  it('passes through an absolute video publicId and uses an absolute posterId as-is', () => {
    const remote = 'https://example.com/clip.mp4';
    const poster = 'https://images.unsplash.com/poster.jpg';
    const res = buildCloudinaryUrl(CLOUD, {
      type: MediaType.VIDEO,
      publicId: remote,
      posterId: poster,
    });
    expect(res.url).toBe(remote);
    expect(res.posterUrl).toBe(poster);
  });
});
