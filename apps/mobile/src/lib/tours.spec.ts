import { toTourCardVm, type TourSummaryDto } from './tours';

const dto = {
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  durationDays: 3,
  basePrice: '450',
  currency: 'USD',
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
  it('picks the primary destination and hero image', () => {
    const vm = toTourCardVm(dto);
    expect(vm).toEqual({
      slug: 'ha-long-cruise',
      title: 'Ha Long Bay Cruise',
      destination: 'Ha Long',
      durationDays: 3,
      price: 450,
      currency: 'USD',
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
});
