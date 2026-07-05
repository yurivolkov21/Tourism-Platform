import { insertSnippet } from './markdown';

describe('insertSnippet', () => {
  it('inserts at the cursor with blank-line padding on both sides', () => {
    const out = insertSnippet('before\nafter', 6, '![](https://x/y.jpg)');
    expect(out.next).toBe('before\n\n![](https://x/y.jpg)\n\nafter');
    // Caret lands right after the inserted block (before + pre + snippet + post).
    expect(out.nextCursor).toBe('before\n\n![](https://x/y.jpg)\n'.length);
  });

  it('does not double blank lines that already exist', () => {
    const out = insertSnippet('before\n\n', 8, '![](u)');
    expect(out.next).toBe('before\n\n![](u)\n\n');
  });

  it('handles empty content and cursor 0', () => {
    const out = insertSnippet('', 0, '![](u)');
    expect(out.next).toBe('![](u)\n\n');
  });
});
