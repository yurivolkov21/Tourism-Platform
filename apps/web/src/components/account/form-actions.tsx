import type { ReactNode } from 'react';

/**
 * The action strip at the foot of a form inside an `AccountSectionRow`: a tinted band, ruled off
 * from the fields, running the panel's full width with its buttons right-aligned. It gives the
 * submit button a place to stand instead of leaving it floating under the last field.
 *
 * The negative margins cancel the row's own padding, which is the one thing here that couples to
 * `AccountSectionRow` — kept in this single component so the two can't drift apart unnoticed.
 */
export function FormActions({
  flash = false,
  children,
}: {
  /** Pulses the bar once after a successful save. Decorative — the toast stays the announced channel. */
  flash?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-muted/20 -mx-5 -mb-5 flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3 sm:-mx-6 sm:px-6 ${
        flash ? 'nx-flash' : ''
      }`}
    >
      {children}
    </div>
  );
}

export default FormActions;
