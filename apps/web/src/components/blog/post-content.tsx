import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { slugifyHeading } from '../../lib/blog/derive';

/** Flattens a heading's children to plain text so ids match `extractOutline`'s raw text. */
function headingText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(headingText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return headingText((children as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

const H2_CLASS =
  'font-heading text-foreground mt-10 mb-4 scroll-mt-28 text-2xl font-semibold text-balance first:mt-0';
const H3_CLASS =
  'font-heading text-foreground mt-8 mb-3 scroll-mt-28 text-xl font-semibold text-balance first:mt-0';

/** h1 normalizes to h2 — same rule as `extractOutline` (depth 1 → 2), one visual scale. */
function AnchoredH2({ children, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2 id={slugifyHeading(headingText(children))} className={H2_CLASS} {...props}>
      {children}
    </h2>
  );
}

function AnchoredH3({ children, ...props }: ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3 id={slugifyHeading(headingText(children))} className={H3_CLASS} {...props}>
      {children}
    </h3>
  );
}

/**
 * Markdown → styled article body. Scoped classes (no typography plugin) keep the bundle lean and
 * the rendering on-brand; raw HTML is NOT enabled (no `rehype-raw`), so authored content can't
 * inject scripts. Headings carry stable anchor ids for the outline rail.
 */
const MD_COMPONENTS: Components = {
  h1: (props) => <AnchoredH2 {...props} />,
  h2: (props) => <AnchoredH2 {...props} />,
  h3: (props) => <AnchoredH3 {...props} />,
  h4: (props) => <h4 className="text-foreground mt-6 mb-2 font-semibold first:mt-0" {...props} />,
  p: (props) => (
    <p className="text-muted-foreground mb-4 leading-relaxed text-pretty last:mb-0" {...props} />
  ),
  strong: (props) => <strong className="text-foreground font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  ul: (props) => <ul className="mb-4 list-disc space-y-1.5 pl-5 last:mb-0" {...props} />,
  ol: (props) => <ol className="mb-4 list-decimal space-y-1.5 pl-5 last:mb-0" {...props} />,
  li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
    <li className="text-muted-foreground marker:text-primary/60 leading-relaxed text-pretty" {...props}>
      {children}
    </li>
  ),
  a: (props) => <a className="text-primary font-medium hover:underline" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-primary/40 text-muted-foreground my-6 border-l-4 pl-4 italic" {...props} />
  ),
  hr: () => <hr className="border-border/60 my-8" />,
  // Article images are author-managed Cloudinary/remote URLs of unknown dimensions — a plain
  // <img> (like the admin preview) beats next/image's required width/height here.
  img: (props) => (
    // eslint-disable-next-line
    <img loading="lazy" className="my-6 w-full rounded-xl" {...props} alt={props.alt ?? ''} />
  ),
  pre: (props) => (
    <pre className="bg-muted my-6 overflow-x-auto rounded-lg p-4 text-sm" {...props} />
  ),
  code: (props) => <code className="bg-muted rounded px-1.5 py-0.5 text-[0.9em]" {...props} />,
  table: (props) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-border/60 text-foreground border-b px-3 py-2 text-left font-semibold" {...props} />
  ),
  td: (props) => <td className="border-border/40 border-b px-3 py-2 align-top" {...props} />,
};

/** The article body for `/blog/[slug]` (server component — react-markdown is RSC-safe). */
export function PostContent({ content }: { content: string }) {
  return (
    <div className="min-w-0 text-base">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default PostContent;
