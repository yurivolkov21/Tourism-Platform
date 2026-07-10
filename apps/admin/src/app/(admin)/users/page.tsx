import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { UsersFilters } from '../../../components/users/users-filters';
import { UsersTable } from '../../../components/users/users-table';
import {
  listUsers,
  type UserList,
  type UserRole,
} from '../../../lib/users/data';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { ServerTablePagination } from '../../../components/crud/server-table-pagination';
import { parsePageSize } from '../../../lib/pagination';

const ROLES: UserRole[] = ['CUSTOMER', 'ADMIN'];

/** Narrows a raw `?role=` value to a valid enum member (or undefined = all). */
function parseRole(raw?: string): UserRole | undefined {
  return ROLES.find((r) => r === raw);
}

/** Narrows a raw `?page=` value to a positive integer (defaults to 1). */
function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface UsersPageProps {
  searchParams: Promise<{
    role?: string;
    page?: string;
    q?: string;
    pageSize?: string;
  }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const sp = await searchParams;
  const role = parseRole(sp.role);
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);
  const search = sp.q?.trim() ?? '';

  let result: UserList | undefined;
  let error: string | null = null;
  try {
    result = await listUsers({
      page,
      pageSize,
      role,
      search: search || undefined,
    });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];
  const meta = result?.meta;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Users"
        description="Customer and admin accounts. Search by name or email; open one to see their footprint, change their role, or delete the account."
      />

      <div className="flex flex-col gap-4">
        {error ? (
          <>
            <UsersFilters role={role ?? 'all'} search={search} />
            <ErrorAlert>
              Couldn&apos;t load users: {error}. Check that the API is running
              and your admin session is valid.
            </ErrorAlert>
          </>
        ) : (
          <>
            <UsersTable rows={rows} role={role ?? 'all'} search={search} />
            {rows.length > 0 && meta ? (
              <ServerTablePagination
                page={meta.page}
                pageCount={meta.totalPages}
                total={meta.total}
                pageSize={meta.pageSize}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
