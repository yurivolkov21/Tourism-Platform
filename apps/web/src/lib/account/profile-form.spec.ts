import { buildUpdateProfilePayload } from './profile-form';

describe('buildUpdateProfilePayload', () => {
  it('trims and includes provided fields', () => {
    expect(buildUpdateProfilePayload({ fullName: '  Nguyen Van A  ', phone: ' +84901234567 ' })).toEqual(
      { fullName: 'Nguyen Van A', phone: '+84901234567' },
    );
  });

  it('drops empty fields (set-only — blank does not clear)', () => {
    expect(buildUpdateProfilePayload({ fullName: 'Jo', phone: '   ' })).toEqual({ fullName: 'Jo' });
    expect(buildUpdateProfilePayload({ fullName: '', phone: '' })).toEqual({});
  });
});
