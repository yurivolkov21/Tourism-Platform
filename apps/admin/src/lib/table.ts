import '@tanstack/react-table';
import type { Table } from '@tanstack/react-table';

/**
 * Shared TanStack Table typing for the admin tables.
 *
 * Column ids default to the accessor key (e.g. `compareAtPrice`), which reads badly in the
 * "Columns" show/hide menu. Every hideable column carries `meta.label` with a human name that
 * {@link ColumnsMenu} prefers over the raw id.
 */
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends import('@tanstack/react-table').RowData, TValue> {
    /** Human label shown in the Columns menu (falls back to the column id). */
    label?: string;
    /** Horizontal alignment applied to both the header and body cells by {@link AdminTableShell}. */
    align?: 'right';
  }
}

export interface ColumnToggle {
  id: string;
  /** Display label (prefers `columnDef.meta.label`, falls back to the column id). */
  label: string;
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
}

/**
 * Pure selector of the hideable columns for the Columns menu: every column that allows hiding
 * (`enableHiding !== false`), with its display label resolved (`meta.label ?? id`) and current
 * visibility. Lives here (not next to the component) so it imports only `@tanstack/react-table` — the
 * `@tourism/ui` barrel pulls in gsap, which can't be imported under jsdom.
 */
export function hideableColumns<T>(table: Table<T>): ColumnToggle[] {
  return table
    .getAllColumns()
    .filter((c) => c.getCanHide())
    .map((c) => ({
      id: c.id,
      label: c.columnDef.meta?.label ?? c.id,
      isVisible: c.getIsVisible(),
      setVisible: (visible: boolean) => c.toggleVisibility(visible),
    }));
}
