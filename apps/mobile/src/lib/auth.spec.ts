import {
  mapAuthError,
  validateForgot,
  validateSignIn,
  validateSignUp,
} from './auth';

test('validateSignIn flags bad email and empty password', () => {
  expect(validateSignIn({ email: 'a@b.co', password: 'secret123' })).toEqual(
    {},
  );
  expect(validateSignIn({ email: 'nope', password: 'secret123' })).toEqual({
    email: 'emailInvalid',
  });
  expect(validateSignIn({ email: 'a@b.co', password: '' })).toEqual({
    password: 'passwordRequired',
  });
});

test('validateSignUp enforces name, email, 8+ password, matching confirm', () => {
  const ok = {
    fullName: 'Jane',
    email: 'a@b.co',
    password: 'secret123',
    confirm: 'secret123',
  };
  expect(validateSignUp(ok)).toEqual({});
  expect(validateSignUp({ ...ok, fullName: ' ' })).toEqual({
    fullName: 'nameRequired',
  });
  expect(
    validateSignUp({ ...ok, password: 'short', confirm: 'short' }),
  ).toEqual({
    password: 'passwordTooShort',
  });
  expect(validateSignUp({ ...ok, confirm: 'different' })).toEqual({
    confirm: 'confirmMismatch',
  });
});

test('validateForgot checks the email', () => {
  expect(validateForgot({ email: 'a@b.co' })).toEqual({});
  expect(validateForgot({ email: 'x' })).toEqual({ email: 'emailInvalid' });
});

test('mapAuthError translates supabase messages to copy keys', () => {
  expect(mapAuthError({ message: 'Invalid login credentials' })).toBe(
    'invalidCredentials',
  );
  expect(mapAuthError({ message: 'User already registered' })).toBe(
    'emailTaken',
  );
  expect(
    mapAuthError({ message: 'Password should be at least 6 characters.' }),
  ).toBe('weakPassword');
  expect(mapAuthError({ message: 'boom' })).toBe('generic');
  expect(mapAuthError(null)).toBe('generic');
});
