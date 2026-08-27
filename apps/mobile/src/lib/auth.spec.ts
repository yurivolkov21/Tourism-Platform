import {
  MAX_NAME,
  checkPhone,
  mapAuthError,
  mergeFieldError,
  validateForgot,
  validateSignIn,
  validateSignUp,
} from './auth';

const STRONG = 'Secret12!';

test('validateSignIn tells a blank email from a malformed one', () => {
  expect(validateSignIn({ email: 'a@b.co', password: 'secret123' })).toEqual(
    {},
  );
  expect(validateSignIn({ email: '', password: 'secret123' })).toEqual({
    email: 'emailRequired',
  });
  expect(validateSignIn({ email: 'nope', password: 'secret123' })).toEqual({
    email: 'emailInvalid',
  });
  expect(validateSignIn({ email: 'a@b.co', password: '' })).toEqual({
    password: 'passwordRequired',
  });
});

test('validateSignIn does not apply the new-password policy to logins', () => {
  // Pre-policy accounts must still be able to sign in with an old password.
  expect(validateSignIn({ email: 'a@b.co', password: 'old' })).toEqual({});
});

test('validateSignUp enforces name, email and the full password policy', () => {
  const ok = {
    fullName: 'Jane',
    email: 'a@b.co',
    password: STRONG,
    confirm: STRONG,
  };
  expect(validateSignUp(ok)).toEqual({});
  expect(validateSignUp({ ...ok, fullName: ' ' })).toEqual({
    fullName: 'nameRequired',
  });
  expect(validateSignUp({ ...ok, fullName: 'x'.repeat(MAX_NAME + 1) })).toEqual(
    { fullName: 'nameTooLong' },
  );
});

test('validateSignUp separates a short password from a weak one', () => {
  const base = { fullName: 'Jane', email: 'a@b.co' };
  // Every class present, only length missing → say exactly that.
  expect(
    validateSignUp({ ...base, password: 'Ab1!', confirm: 'Ab1!' }).password,
  ).toBe('passwordTooShort');
  // Long enough, but classes missing → point at the requirements checklist.
  expect(
    validateSignUp({ ...base, password: 'abcdefgh', confirm: 'abcdefgh' })
      .password,
  ).toBe('passwordPolicy');
  expect(validateSignUp({ ...base, password: '', confirm: '' }).password).toBe(
    'passwordRequired',
  );
});

test('validateSignUp checks confirm independently of the password verdict', () => {
  // A weak password must not swallow a genuine mismatch on the confirm field.
  const errors = validateSignUp({
    fullName: 'Jane',
    email: 'a@b.co',
    password: 'weak',
    confirm: 'different',
  });
  expect(errors.password).toBe('passwordPolicy');
  expect(errors.confirm).toBe('confirmMismatch');
  expect(
    validateSignUp({
      fullName: 'Jane',
      email: 'a@b.co',
      password: STRONG,
      confirm: '',
    }).confirm,
  ).toBe('confirmRequired');
});

test('validateForgot checks the email', () => {
  expect(validateForgot({ email: 'a@b.co' })).toEqual({});
  expect(validateForgot({ email: 'x' })).toEqual({ email: 'emailInvalid' });
  expect(validateForgot({ email: '' })).toEqual({ email: 'emailRequired' });
});

test('checkPhone accepts dialable numbers and rejects the rest', () => {
  expect(checkPhone('')).toBeNull(); // optional
  expect(checkPhone('+84 912 345 678')).toBeNull();
  expect(checkPhone('(024) 3825-7979')).toBeNull();
  expect(checkPhone('0912abc678')).toBe('phoneInvalid');
  expect(checkPhone('12345')).toBe('phoneInvalid'); // too few digits
  expect(checkPhone('1234567890123456')).toBe('phoneInvalid'); // too many
});

test('mergeFieldError adopts one field and leaves the others alone', () => {
  type Errors = Partial<Record<'email' | 'password', string>>;
  const previous: Errors = {
    email: 'emailInvalid',
    password: 'passwordRequired',
  };
  // Fixing the email clears only the email error.
  expect(mergeFieldError(previous, {} as Errors, 'email')).toEqual({
    password: 'passwordRequired',
  });
  // Blurring a still-empty field sets only that field.
  expect(
    mergeFieldError({} as Errors, { email: 'emailRequired' }, 'email'),
  ).toEqual({ email: 'emailRequired' });
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

test('mapAuthError names the cases that used to fall through to generic', () => {
  expect(
    mapAuthError({
      message: 'New password should be different from the old password.',
    }),
  ).toBe('samePassword');
  expect(mapAuthError({ code: 'same_password' })).toBe('samePassword');
  expect(mapAuthError({ message: 'Email rate limit exceeded' })).toBe(
    'rateLimited',
  );
  expect(mapAuthError({ code: 'over_email_send_rate_limit' })).toBe(
    'rateLimited',
  );
  expect(mapAuthError({ message: 'Email not confirmed' })).toBe(
    'emailNotConfirmed',
  );
  expect(mapAuthError({ message: 'Network request failed' })).toBe('network');
  expect(mapAuthError({ code: 'email_exists' })).toBe('emailTaken');
});
