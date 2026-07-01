import type { Table } from '@tanstack/react-table';

import { hideableColumns } from './table';

/**
 * Minimal fake of the slice of TanStack's `Table` that {@link hideableColumns} touches, so the
 * label-fallback + `getCanHide` filter can be tested without a real table instance or Base UI render.
 */
interface FakeColumn {
  id: string;
  canHide: boolean;
  visible: boolean;
  label?: string;
}

function fakeTable(columns: FakeColumn[]): { table: Table<unknown>; toggle: jest.Mock } {
  const toggle = jest.fn();
  // Build column objects once so identity is stable across getAllColumns() calls.
  const built = columns.map((c) => ({
    id: c.id,
    getCanHide: () => c.canHide,
    getIsVisible: () => c.visible,
    toggleVisibility: (visible: boolean) => toggle(c.id, visible),
    columnDef: { meta: c.label === undefined ? undefined : { label: c.label } },
  }));
  const table = { getAllColumns: () => built };
  return { table: table as unknown as Table<unknown>, toggle };
}

describe('hideableColumns', () => {
  it('lists only columns that allow hiding', () => {
    const { table } = fakeTable([
      { id: 'title', canHide: false, visible: true },
      { id: 'category', canHide: true, visible: true },
      { id: 'actions', canHide: false, visible: true },
    ]);

    expect(hideableColumns(table).map((c) => c.id)).toEqual(['category']);
  });

  it('prefers meta.label and falls back to the column id', () => {
    const { table } = fakeTable([
      { id: 'compareAt', canHide: true, visible: true, label: 'Compare-at' },
      { id: 'category', canHide: true, visible: false },
    ]);

    const items = hideableColumns(table);
    expect(items[0]).toMatchObject({ id: 'compareAt', label: 'Compare-at', isVisible: true });
    expect(items[1]).toMatchObject({ id: 'category', label: 'category', isVisible: false });
  });

  it('setVisible forwards to the underlying column toggle', () => {
    const { table, toggle } = fakeTable([
      { id: 'price', canHide: true, visible: true, label: 'Price' },
    ]);

    hideableColumns(table)[0].setVisible(false);
    expect(toggle).toHaveBeenCalledWith('price', false);
  });
});
