import {
  getOrCreateConversationId,
  resetConversationId,
} from './conversation-store';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('conversation-store', () => {
  beforeEach(() => window.localStorage.clear());

  it('mints a uuid on first use and persists it', () => {
    const id = getOrCreateConversationId();
    expect(id).toMatch(UUID_RE);
    expect(getOrCreateConversationId()).toBe(id);
  });

  it('replaces a corrupted stored value', () => {
    window.localStorage.setItem('nexora.chat.conversation', 'not-a-uuid');
    const id = getOrCreateConversationId();
    expect(id).toMatch(UUID_RE);
  });

  it('resetConversationId mints and persists a fresh id', () => {
    const first = getOrCreateConversationId();
    const second = resetConversationId();
    expect(second).toMatch(UUID_RE);
    expect(second).not.toBe(first);
    expect(getOrCreateConversationId()).toBe(second);
  });
});
