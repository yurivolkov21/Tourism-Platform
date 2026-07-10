import type { ReactNode } from 'react';

import { Reveal } from '../motion/reveal';

/** Shared admin list-page header: title + description on the left, a primary action on the right. */
export function AdminListHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </Reveal>
  );
}

export default AdminListHeader;
