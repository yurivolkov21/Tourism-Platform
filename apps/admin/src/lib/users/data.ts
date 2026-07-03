import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

/** List-row shape (`GET /admin/users`). Detail uses the richer {@link AdminUserDetail}. */
export type AdminUser = components['schemas']['AdminUserListItemDto'];
export type AdminUserDetail = components['schemas']['AdminUserDetailDto'];
export type PageMeta = components['schemas']['PageMetaDto'];
export type UserRole = AdminUser['role'];

export interface UserListParams {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  search?: string;
}

export interface UserList {
  data: AdminUser[];
  meta: PageMeta;
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Lists users for the admin table (`GET /admin/users`, paginated + role/search filters). The wire
 * format is already the `{ data, meta }` envelope, so the typed body matches.
 */
export async function listUsers(params: UserListParams = {}): Promise<UserList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/users', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
        role: params.role,
        search: params.search,
      },
    },
  });
  return data as unknown as UserList;
}

/**
 * Fetches one user by id for the detail page. Single resources come back wrapped in the
 * `{ data, error }` envelope at runtime (the generated client types it bare), so we unwrap here.
 */
export async function getUser(id: string): Promise<AdminUserDetail> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/users/{id}', {
    params: { path: { id } },
  });
  return (data as unknown as { data: AdminUserDetail }).data;
}

/** Fetches the caller's own user detail (`GET /admin/users/me`) — same unwrap as {@link getUser}. */
export async function getOwnUser(): Promise<AdminUserDetail> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/users/me');
  return (data as unknown as { data: AdminUserDetail }).data;
}
