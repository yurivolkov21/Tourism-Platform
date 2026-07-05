/**
 * Minimal RSS 2.0 builder for the journal feed — pure string assembly, no deps.
 * All text passes through XML-entity escaping; descriptions are expected to be
 * plain text already (the post excerpts are markdown-stripped upstream).
 */

export interface RssChannel {
  title: string;
  link: string;
  description: string;
}

export interface RssItem {
  title: string;
  link: string;
  description: string;
  /** ISO timestamp; rendered as an RFC-822 `pubDate` when present. */
  pubDate?: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderItem(item: RssItem): string {
  const pubDate = item.pubDate
    ? `\n      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>`
    : '';
  return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>${pubDate}
    </item>`;
}

export function buildRssXml(channel: RssChannel, items: RssItem[]): string {
  const body = items.map(renderItem).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>${body ? `\n${body}` : ''}
  </channel>
</rss>
`;
}
