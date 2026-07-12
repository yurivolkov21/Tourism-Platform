import { excludeUserOwnedFor } from './query';

describe('excludeUserOwnedFor', () => {
  it('excludes USER-owned assets from the default (unfiltered) library view', () => {
    expect(excludeUserOwnedFor(undefined, undefined)).toBe(true);
  });

  it('lets an explicit owner facet through untouched (USER facet = the moderation path)', () => {
    expect(excludeUserOwnedFor('USER', undefined)).toBeUndefined();
    expect(excludeUserOwnedFor('TOUR', undefined)).toBeUndefined();
  });

  it('does not exclude when filtering by the avatar role (avatars are USER-owned — excluding would always return empty)', () => {
    expect(excludeUserOwnedFor(undefined, 'avatar')).toBeUndefined();
  });

  it('still excludes for non-avatar role filters', () => {
    expect(excludeUserOwnedFor(undefined, 'hero')).toBe(true);
    expect(excludeUserOwnedFor(undefined, 'gallery')).toBe(true);
    expect(excludeUserOwnedFor(undefined, 'body')).toBe(true);
  });
});
