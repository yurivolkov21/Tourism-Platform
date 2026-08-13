import type { ReactNode } from 'react';

/**
 * One settings group, in the original two-column shape: a labelled description on the left, the
 * content panel on the right. The polish over the plain version is the panel the content sits in —
 * it used to float directly on the page background, which left nothing marking where one group
 * ended and the next began.
 */
export function AccountSection({
  id,
  title,
  description,
  tone = 'default',
  children,
}: {
  id: string;
  title: string;
  description: string;
  tone?: 'default' | 'danger';
  children: ReactNode;
}) {
  const danger = tone === 'danger';

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="grid gap-5 py-8 lg:grid-cols-3 lg:gap-10"
    >
      <div className="min-w-0">
        <h2
          id={`${id}-heading`}
          className="font-heading text-base font-semibold"
        >
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          {description}
        </p>
      </div>

      <div className="lg:col-span-2">
        {/* Rows divide themselves: the padding lives on each row, not on this panel, so the rule
            between two rows runs the panel's full width. An inset hairline reads as a gap rather
            than a boundary. */}
        <div
          className={`bg-card shadow-card divide-y rounded-2xl border ${
            danger ? 'border-destructive/30 bg-destructive/5' : ''
          }`}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

/** One labelled block inside a section's panel. Untitled rows are just a padded container. */
export function AccountSectionRow({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    // The row you are typing in warms slightly. On a page that is nothing but stacked forms, it is
    // the cheapest way to answer "where am I" without adding a single pixel of chrome.
    <div className="focus-within:bg-muted/20 px-5 py-5 transition-colors sm:px-6">
      {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
      {description ? (
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          {description}
        </p>
      ) : null}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  );
}

export default AccountSection;
