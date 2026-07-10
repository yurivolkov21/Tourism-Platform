import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Markdown → styled elements for a post body (admin detail preview). Mirrors the web itinerary
 * renderer: scoped classes (no typography plugin), raw HTML NOT enabled (no `rehype-raw`) so
 * authored content can't inject scripts. `h1` renders as an h2 — the page owns the real h1.
 */
const MD_COMPONENTS: Components = {
  p: (props) => (
    <p
      className="text-muted-foreground mb-3 leading-relaxed text-pretty last:mb-0"
      {...props}
    />
  ),
  strong: (props) => (
    <strong className="text-foreground font-semibold" {...props} />
  ),
  em: (props) => <em className="italic" {...props} />,
  ul: (props) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0" {...props} />
  ),
  ol: (props) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0" {...props} />
  ),
  li: (props) => (
    <li
      className="text-muted-foreground marker:text-primary/60 leading-relaxed text-pretty"
      {...props}
    />
  ),
  h1: ({ children }) => (
    <h2 className="font-heading text-foreground mt-5 mb-2 text-xl font-semibold first:mt-0">
      {children}
    </h2>
  ),
  h2: (props) => (
    <h2
      className="font-heading text-foreground mt-5 mb-2 text-xl font-semibold first:mt-0"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="font-heading text-foreground mt-4 mb-1.5 text-lg font-semibold first:mt-0"
      {...props}
    />
  ),
  h4: (props) => (
    <h4
      className="text-foreground mt-3 mb-1 font-semibold first:mt-0"
      {...props}
    />
  ),
  a: (props) => (
    <a className="text-primary font-medium hover:underline" {...props} />
  ),
  blockquote: (props) => (
    <blockquote
      className="border-primary/30 text-muted-foreground mb-3 border-l-2 pl-4 italic"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs"
      {...props}
    />
  ),
  hr: () => <hr className="border-border/60 my-4" />,
};

/** Renders a post's Markdown body for the admin detail page. */
export function PostContent({ markdown }: { markdown: string }) {
  return (
    <div className="min-w-0 text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export default PostContent;
