import { extractOutline, readingStats, slugifyHeading } from './derive';

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

describe('slugifyHeading', () => {
  it('lowercases and hyphenates punctuation runs', () => {
    expect(slugifyHeading('Getting There & Away')).toBe('getting-there-away');
  });

  it('strips Vietnamese diacritics to stable ASCII ids', () => {
    expect(slugifyHeading('Một buổi sáng ở Hội An')).toBe('mot-buoi-sang-o-hoi-an');
  });

  it('trims leading/trailing separators', () => {
    expect(slugifyHeading('  ...Ready?  ')).toBe('ready');
  });
});

describe('extractOutline', () => {
  it('collects h1-h3 headings with anchor ids, normalizing h1 to depth 2', () => {
    expect(extractOutline('# Top\n\ntext\n\n## Section\n\n### Sub')).toEqual([
      { depth: 2, text: 'Top', id: 'top' },
      { depth: 2, text: 'Section', id: 'section' },
      { depth: 3, text: 'Sub', id: 'sub' },
    ]);
  });

  it('skips headings inside code fences and ignores h4+', () => {
    expect(extractOutline('```\n# not a heading\n```\n\n## Real\n\n#### Too deep')).toEqual([
      { depth: 2, text: 'Real', id: 'real' },
    ]);
  });

  it('returns empty for heading-less content', () => {
    expect(extractOutline('plain paragraph')).toEqual([]);
  });

  it('strips inline markdown so text and id match the rendered heading', () => {
    expect(extractOutline('## See [Hạ Long](https://example.com/ha-long)')).toEqual([
      { depth: 2, text: 'See Hạ Long', id: 'see-ha-long' },
    ]);
  });

  it('unwraps inline code in headings', () => {
    expect(extractOutline('### Run `npm i` first')).toEqual([
      { depth: 3, text: 'Run npm i first', id: 'run-npm-i-first' },
    ]);
  });
});
