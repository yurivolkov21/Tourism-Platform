import type { ReactNode } from 'react';

/** Two-column settings row: a label/description on the left, the form/content on the right. */
export function AccountSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6 py-8 lg:grid-cols-3 lg:gap-10">
      <div className="space-y-1">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      </div>
      <div className="lg:col-span-2">{children}</div>
    </div>
  );
}

export default AccountSection;
