import type { ApiResponse } from './api-response.js';

describe('ApiResponse envelope', () => {
  it('shapes a success envelope (data set, error null)', () => {
    const ok: ApiResponse<{ id: string }> = {
      data: { id: '1' },
      error: null,
    };
    expect(ok.data).toEqual({ id: '1' });
    expect(ok.error).toBeNull();
  });

  it('shapes an error envelope (data null, error set)', () => {
    const err: ApiResponse<null> = {
      data: null,
      error: { code: 'NOT_FOUND', message: 'Not found' },
    };
    expect(err.data).toBeNull();
    expect(err.error?.code).toBe('NOT_FOUND');
  });

  it('carries pagination meta on list responses', () => {
    const list: ApiResponse<number[]> = {
      data: [1, 2],
      error: null,
      meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    };
    expect(list.meta?.total).toBe(2);
  });
});
