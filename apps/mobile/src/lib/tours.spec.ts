import { toTourCardVm, type TourSummaryDto } from './tours';

const dto = {
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  summary: 'Two days among the karsts.',
  durationDays: 3,
  basePrice: '450',
  compareAtPrice: '520',
  currency: 'USD',
  averageRating: 4.8,
  reviewsCount: 12,
  badges: ['POPULAR'],
  nextDepartureSeatsLeft: 4,
  category: { slug: 'cruise', name: 'Cruises' },
  destinations: [
    { isPrimary: false, destination: { name: 'Hanoi' } },
    { isPrimary: true, destination: { name: 'Ha Long' } },
  ],
  media: [
    { role: 'gallery', url: 'https://img.test/g.jpg' },
    { role: 'hero', url: 'https://img.test/h.jpg' },
  ],
} as unknown as TourSummaryDto;

describe('toTourCardVm', () => {
  it('picks the primary destination and hero image, mapping the filterable fields', () => {
    const vm = toTourCardVm(dto);
    expect(vm).toEqual({
      slug: 'ha-long-cruise',
      title: 'Ha Long Bay Cruise',
      summary: 'Two days among the karsts.',
      destination: 'Ha Long',
      durationDays: 3,
      basePrice: 450,
      compareAtPrice: 520,
      currency: 'USD',
      rating: 4.8,
      reviewCount: 12,
      badges: ['POPULAR'],
      nextDepartureSeatsLeft: 4,
      category: 'cruise',
      categoryName: 'Cruises',
      image: 'https://img.test/h.jpg',
    });
  });

  it('falls back to first destination/media when no primary/hero', () => {
    const bare = {
      ...dto,
      destinations: [{ isPrimary: false, destination: { name: 'Hanoi' } }],
      media: [{ role: 'gallery', url: 'https://img.test/g.jpg' }],
    } as unknown as TourSummaryDto;
    const vm = toTourCardVm(bare);
    expect(vm.destination).toBe('Hanoi');
    expect(vm.image).toBe('https://img.test/g.jpg');
  });

  it('maps null compareAtPrice and missing category to undefined', () => {
    const bare = {
      ...dto,
      compareAtPrice: null,
      category: null,
      badges: null,
      nextDepartureSeatsLeft: null,
    } as unknown as TourSummaryDto;
    const vm = toTourCardVm(bare);
    expect(vm.compareAtPrice).toBeUndefined();
    expect(vm.category).toBeUndefined();
    expect(vm.categoryName).toBeUndefined();
    expect(vm.badges).toEqual([]);
    expect(vm.nextDepartureSeatsLeft).toBeUndefined();
  });
});
