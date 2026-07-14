import { canAccessConversation } from './ownership';

describe('canAccessConversation', () => {
  const guestConvo = { userId: null };
  const ownedConvo = { userId: 'user-1' };

  it('lets anyone holding the id access a guest conversation', () => {
    expect(canAccessConversation(guestConvo, null)).toBe(true);
    expect(canAccessConversation(guestConvo, { id: 'user-1' })).toBe(true);
  });

  it('denies an owned conversation without a JWT user', () => {
    expect(canAccessConversation(ownedConvo, null)).toBe(false);
  });

  it('denies an owned conversation for a different user', () => {
    expect(canAccessConversation(ownedConvo, { id: 'user-2' })).toBe(false);
  });

  it('allows the owning user', () => {
    expect(canAccessConversation(ownedConvo, { id: 'user-1' })).toBe(true);
  });
});
