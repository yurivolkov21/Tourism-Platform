import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { slugifyHeading } from '../../lib/blog/derive';

/** Flattens a heading's children to plain text so ids match `extractOutline`'s raw text. */
function headingText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number')
    return String(children);
  if (Array.isArray(children)) return children.map(headingText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return headingText(
      (children as { props: { children?: ReactNode } }).props.children,
    );
  }
  return '';
}

/** h1 normalizes to h2 — same rule as `extractOutline` (depth 1 → 2), one visual scale. */
function AnchoredH2({ children, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2 id={slugifyHeading(headingText(children))} {...props}>
      {children}
    </h2>
  );
}

function AnchoredH3({ children, ...props }: ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3 id={slugifyHeading(headingText(children))} {...props}>
      {children}
    </h3>
  );
}

/**
 * Markdown → article body, styled by shadcn/typeset (`app/typeset.css`, preset
 * `.typeset-article`) instead of per-element class maps. The only custom
 * renderers left carry BEHAVIOR typeset can't: heading anchor ids for the
 * outline rail, lazy-loading images, and the `.typeset-scroll` wrapper that
 * lets wide tables scroll instead of squeeze. Raw HTML stays disabled (no
 * `rehype-raw`), so authored content can't inject scripts.
 */
const MD_COMPONENTS: Components = {
  h1: (props) => <AnchoredH2 {...props} />,
  h2: (props) => <AnchoredH2 {...props} />,
  h3: (props) => <AnchoredH3 {...props} />,
  // Article images are author-managed Cloudinary/remote URLs of unknown dimensions — a plain
  // <img> (like the admin preview) beats next/image's required width/height here.
  img: (props) => <img loading="lazy" {...props} alt={props.alt ?? ''} />,
  table: (props) => (
    <div className="typeset-scroll">
      <table {...props} />
    </div>
  ),
};

/** The article body for `/blog/[slug]` (server component — react-markdown is RSC-safe). */
export function PostContent({ content }: { content: string }) {
  return (
    <div className="typeset typeset-article min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default PostContent;
