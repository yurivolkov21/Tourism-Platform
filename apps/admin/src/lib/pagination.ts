/** Shared rows-per-page options for admin tables (matches the Dashboard data table). Pure module —
 * importable by server components (unlike the `'use client'` pagination component). */
export const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;
export const DEFAULT_PAGE_SIZE = 10;

/** Narrow a raw `?pageSize=` value to an allowed option (else the default). */
export function parsePageSize(raw?: string | null): number {
  const n = Number(raw);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? n
    : DEFAULT_PAGE_SIZE;
}
