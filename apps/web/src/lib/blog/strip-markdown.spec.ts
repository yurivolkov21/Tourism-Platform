import { stripInlineMarkdown, stripMarkdownSyntax } from './strip-markdown';

describe('stripInlineMarkdown', () => {
  it('reduces links to their text (what react-markdown renders)', () => {
    expect(
      stripInlineMarkdown('See [Hạ Long](https://example.com/ha-long)'),
    ).toBe('See Hạ Long');
  });

  it('removes images entirely (an img renders no heading text)', () => {
    expect(stripInlineMarkdown('Before ![boat](https://x/y.jpg) after')).toBe(
      'Before after',
    );
  });

  it('unwraps inline code to its content', () => {
    expect(stripInlineMarkdown('Run `npm i` first')).toBe('Run npm i first');
  });

  it('drops emphasis markers', () => {
    expect(stripInlineMarkdown('**Bold** and _em_ and ~~gone~~')).toBe(
      'Bold and em and gone',
    );
  });

  it('leaves plain text untouched', () => {
    expect(stripInlineMarkdown('Getting There & Away')).toBe(
      'Getting There & Away',
    );
  });
});

describe('stripMarkdownSyntax', () => {
  it('strips fences, images, links and syntax chars to plain words', () => {
    const out = stripMarkdownSyntax(
      '## Title\n\n```js\nconst a = 1;\n```\n\n**bold** [link](https://example.com)',
    );
    expect(out.split(/\s+/).filter(Boolean)).toEqual(['Title', 'bold', 'link']);
  });

  it('keeps link text but not urls', () => {
    const out = stripMarkdownSyntax('go to [the beach](https://x/beach) now');
    expect(out).toContain('the beach');
    expect(out).not.toContain('https');
  });

  it('passes plain prose through with words intact', () => {
    const out = stripMarkdownSyntax('a plain sentence');
    expect(out.split(/\s+/).filter(Boolean)).toEqual([
      'a',
      'plain',
      'sentence',
    ]);
  });
});
