import { extractOutline, readingStats } from './derive';

describe('readingStats', () => {
  it('counts words and computes minutes at ~200 wpm', () => {
    const content = Array.from({ length: 400 }, () => 'word').join(' ');
    expect(readingStats(content)).toEqual({ words: 400, minutes: 2 });
  });

  it('ignores code fences and markdown syntax', () => {
    const { words } = readingStats(
      '## Title\n\n```js\nconst a = 1;\n```\n\n**bold** [link](https://example.com)',
    );
    expect(words).toBe(3); // Title, bold, link
  });

  it('returns zeros for empty content', () => {
    expect(readingStats('')).toEqual({ words: 0, minutes: 0 });
  });

  it('floors short posts at one minute', () => {
    expect(readingStats('just a few words here').minutes).toBe(1);
  });
});

describe('extractOutline', () => {
  it('collects h1–h3 headings, normalizing h1 to depth 2', () => {
    expect(extractOutline('# Top\n\ntext\n\n## Section\n\n### Sub')).toEqual([
      { depth: 2, text: 'Top' },
      { depth: 2, text: 'Section' },
      { depth: 3, text: 'Sub' },
    ]);
  });

  it('skips headings inside code fences and ignores h4+', () => {
    expect(
      extractOutline('```\n# not a heading\n```\n\n## Real\n\n#### Too deep'),
    ).toEqual([{ depth: 2, text: 'Real' }]);
  });

  it('returns empty for heading-less content', () => {
    expect(extractOutline('plain paragraph')).toEqual([]);
  });
});
