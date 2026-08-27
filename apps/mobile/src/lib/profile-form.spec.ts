import { buildUpdateProfilePayload, validateProfile } from './profile-form';

test('trims and includes provided fields', () => {
  expect(
    buildUpdateProfilePayload({
      fullName: '  Nguyen Van A  ',
      phone: ' +84901234567 ',
    }),
  ).toEqual({ fullName: 'Nguyen Van A', phone: '+84901234567' });
});

test('drops empty fields (set-only — blank does not clear)', () => {
  expect(buildUpdateProfilePayload({ fullName: 'Jo', phone: '   ' })).toEqual({
    fullName: 'Jo',
  });
  expect(buildUpdateProfilePayload({ fullName: '', phone: '' })).toEqual({});
});

test('validateProfile blames the field that is actually wrong', () => {
  expect(
    validateProfile({ fullName: 'Nguyen Van A', phone: '+84901234567' }),
  ).toEqual({});
  expect(validateProfile({ fullName: '  ', phone: '' })).toEqual({
    fullName: 'nameRequired',
  });
  // The phone is the broken field here — the name is fine.
  expect(validateProfile({ fullName: 'Jo', phone: '09-abc' })).toEqual({
    phone: 'phoneInvalid',
  });
});

test('validateProfile treats a blank phone as optional', () => {
  expect(validateProfile({ fullName: 'Jo', phone: '   ' })).toEqual({});
});
