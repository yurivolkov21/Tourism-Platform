'use client';

import { ChevronDown, Columns3 } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@tourism/ui';

import { hideableColumns } from '../../lib/table';

/**
 * Column show/hide dropdown for the admin data tables — the "Columns" button, mirroring the Dashboard
 * table. Lists every hideable column as a checkbox; toggling flips its visibility.
 * `closeOnClick={false}` (Base UI) keeps the menu open across multiple toggles.
 */
export function ColumnsMenu<T>({ table }: { table: Table<T> }) {
  const columns = hideableColumns(table);
  if (columns.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="cursor-pointer" />}
        aria-label="Toggle columns"
      >
        <Columns3 className="size-4" /> Columns <ChevronDown className="text-muted-foreground size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {columns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={c.isVisible}
            onCheckedChange={(v) => c.setVisible(!!v)}
            closeOnClick={false}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ColumnsMenu;
