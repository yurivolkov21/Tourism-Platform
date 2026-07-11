import { columnPrefsKey, parseStoredVisibility } from './table-prefs';

describe('columnPrefsKey', () => {
  it('namespaces and versions the storage key per table', () => {
    expect(columnPrefsKey('tours')).toBe('tourism-admin.columns.v1.tours');
    expect(columnPrefsKey('dashboard-bookings')).toBe(
      'tourism-admin.columns.v1.dashboard-bookings',
    );
  });
});

describe('parseStoredVisibility', () => {
  it('accepts a JSON object whose values are all booleans', () => {
    expect(parseStoredVisibility('{"cover":false,"rating":true}')).toEqual({
      cover: false,
      rating: true,
    });
    expect(parseStoredVisibility('{}')).toEqual({});
  });

  it('returns null for missing input', () => {
    expect(parseStoredVisibility(null)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseStoredVisibility('{oops')).toBeNull();
    expect(parseStoredVisibility('')).toBeNull();
  });

  it('returns null for non-object JSON payloads', () => {
    expect(parseStoredVisibility('true')).toBeNull();
    expect(parseStoredVisibility('42')).toBeNull();
    expect(parseStoredVisibility('"cover"')).toBeNull();
    expect(parseStoredVisibility('null')).toBeNull();
    expect(parseStoredVisibility('["cover"]')).toBeNull();
  });

  it('returns null when any value is not a boolean', () => {
    expect(parseStoredVisibility('{"cover":false,"rating":"yes"}')).toBeNull();
    expect(parseStoredVisibility('{"cover":1}')).toBeNull();
    expect(parseStoredVisibility('{"cover":null}')).toBeNull();
  });
});
