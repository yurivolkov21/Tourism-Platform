/**
 * Inserts a markdown block snippet at `cursor`, padding with blank lines so the image
 * renders as its own paragraph. Returns the new content + where the caret should land
 * (after the inserted block).
 */
export function insertSnippet(
  content: string,
  cursor: number,
  snippet: string,
): { next: string; nextCursor: number } {
  const at = Math.max(0, Math.min(cursor, content.length));
  const before = content.slice(0, at);
  const after = content.slice(at);

  const pre = before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const post = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';

  const block = `${pre}${snippet}${post}`;
  const next = `${before}${block}${after}`;
  return { next, nextCursor: before.length + block.length };
}
