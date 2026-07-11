import { act, renderHook } from '@testing-library/react';

import { usePersistentColumnVisibility } from './use-persistent-column-visibility';

describe('usePersistentColumnVisibility', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('starts with the defaults when nothing is stored', () => {
    const { result } = renderHook(() => usePersistentColumnVisibility('tours'));
    expect(result.current[0]).toEqual({});
  });

  it('applies a stored visibility state after mount', () => {
    window.localStorage.setItem(
      'tourism-admin.columns.v1.tours',
      JSON.stringify({ cover: false }),
    );
    const { result } = renderHook(() => usePersistentColumnVisibility('tours'));
    expect(result.current[0]).toEqual({ cover: false });
  });

  it('ignores a corrupt stored value', () => {
    window.localStorage.setItem('tourism-admin.columns.v1.tours', '{oops');
    const { result } = renderHook(() => usePersistentColumnVisibility('tours'));
    expect(result.current[0]).toEqual({});
  });

  it('persists changes back to localStorage under the table key', () => {
    const { result } = renderHook(() => usePersistentColumnVisibility('tours'));
    act(() => {
      result.current[1]({ rating: false });
    });
    expect(result.current[0]).toEqual({ rating: false });
    expect(window.localStorage.getItem('tourism-admin.columns.v1.tours')).toBe(
      JSON.stringify({ rating: false }),
    );
  });

  it('supports functional updates like a plain state setter', () => {
    const { result } = renderHook(() => usePersistentColumnVisibility('tours'));
    act(() => {
      result.current[1]({ cover: false });
    });
    act(() => {
      result.current[1]((prev) => ({ ...prev, rating: false }));
    });
    expect(result.current[0]).toEqual({ cover: false, rating: false });
    expect(window.localStorage.getItem('tourism-admin.columns.v1.tours')).toBe(
      JSON.stringify({ cover: false, rating: false }),
    );
  });

  it('keeps tables isolated by key', () => {
    window.localStorage.setItem(
      'tourism-admin.columns.v1.bookings',
      JSON.stringify({ email: false }),
    );
    const { result } = renderHook(() => usePersistentColumnVisibility('tours'));
    expect(result.current[0]).toEqual({});
  });
});
