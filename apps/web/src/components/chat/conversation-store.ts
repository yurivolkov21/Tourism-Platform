/**
 * Guest chat identity: a client-minted conversation uuid in localStorage.
 * Knowledge of the uuid is the guest credential (spec Risk 5) — the API
 * creates the conversation on first use and ownership-checks thereafter.
 */
const STORAGE_KEY = 'nexora.chat.conversation';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mintId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  // Non-crypto fallback (old jsdom/browsers) — fine, the id is not a secret key.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getOrCreateConversationId(): string {
  if (typeof window === 'undefined') return mintId();
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && UUID_RE.test(stored)) return stored;
  return resetConversationId();
}

export function resetConversationId(): string {
  const id = mintId();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
