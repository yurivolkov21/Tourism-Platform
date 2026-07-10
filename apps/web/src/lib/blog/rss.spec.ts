import { buildRssXml } from './rss';

const channel = {
  title: 'Nexora Journal',
  link: 'https://nexora.example/blog',
  description: 'Guides & stories',
};

describe('buildRssXml', () => {
  it('escapes XML entities in channel and item text', () => {
    const xml = buildRssXml(channel, [
      {
        title: 'Fish & chips <in> "Hạ Long"',
        link: 'https://nexora.example/blog/fish?a=1&b=2',
        description: "Don't miss <this>",
      },
    ]);
    expect(xml).toContain('Fish &amp; chips &lt;in&gt; &quot;Hạ Long&quot;');
    expect(xml).toContain('https://nexora.example/blog/fish?a=1&amp;b=2');
    expect(xml).toContain('Don&apos;t miss &lt;this&gt;');
    expect(xml).not.toContain('<this>');
  });

  it('renders pubDate as an RFC-822 date and guid as the permalink', () => {
    const xml = buildRssXml(channel, [
      {
        title: 'T',
        link: 'https://nexora.example/blog/t',
        description: 'D',
        pubDate: '2026-07-01T08:30:00.000Z',
      },
    ]);
    expect(xml).toContain('<pubDate>Wed, 01 Jul 2026 08:30:00 GMT</pubDate>');
    expect(xml).toContain(
      '<guid isPermaLink="true">https://nexora.example/blog/t</guid>',
    );
  });

  it('omits pubDate when the item has none', () => {
    const xml = buildRssXml(channel, [
      { title: 'T', link: 'https://x/t', description: 'D' },
    ]);
    expect(xml).not.toContain('<pubDate>');
  });

  it('produces a valid empty channel for zero items', () => {
    const xml = buildRssXml(channel, []);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<title>Nexora Journal</title>');
    expect(xml).not.toContain('<item>');
  });
});
