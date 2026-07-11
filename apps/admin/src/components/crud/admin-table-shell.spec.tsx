import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';

// The @tourism/ui barrel pulls in gsap/maplibre, which can't load under jsdom —
// mock just the primitives the shell uses (house pattern, see skeletons.spec).
jest.mock('@tourism/ui', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  Table: ({ children }: { children?: React.ReactNode }) => (
    <table>{children}</table>
  ),
  TableHeader: ({ children }: { children?: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableBody: ({ children }: { children?: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableRow: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <tr {...rest}>{children}</tr>
  ),
  TableHead: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <th {...rest}>{children}</th>
  ),
  TableCell: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <td {...rest}>{children}</td>
  ),
}));

jest.mock('../motion/reveal', () => ({
  Reveal: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { AdminTableShell } from './admin-table-shell';

interface Row {
  name: string;
}

const columns: ColumnDef<Row>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorFn: (row) => row.name,
    meta: { label: 'Name' },
    cell: ({ row }) => row.original.name,
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: () => 'x',
  },
];

const data: Row[] = [{ name: 'Banana' }, { name: 'Apple' }];

function Harness() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return <AdminTableShell table={table} />;
}

function headerFor(label: string): HTMLElement {
  const th = screen.getByRole('columnheader', { name: new RegExp(label) });
  return th;
}

describe('AdminTableShell sortable headers', () => {
  it('renders a toggle button only for sortable columns', () => {
    render(<Harness />);
    expect(
      screen.getByRole('button', { name: /sort by name/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /actions/i }),
    ).not.toBeInTheDocument();
  });

  it('cycles aria-sort none → ascending → descending and reorders rows', () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: /sort by name/i });

    expect(headerFor('Name')).toHaveAttribute('aria-sort', 'none');
    let cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('Banana');

    fireEvent.click(button);
    expect(headerFor('Name')).toHaveAttribute('aria-sort', 'ascending');
    cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('Apple');

    fireEvent.click(button);
    expect(headerFor('Name')).toHaveAttribute('aria-sort', 'descending');
    cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('Banana');
  });

  it('puts no aria-sort on non-sortable headers', () => {
    render(<Harness />);
    expect(headerFor('Actions')).not.toHaveAttribute('aria-sort');
  });
});
