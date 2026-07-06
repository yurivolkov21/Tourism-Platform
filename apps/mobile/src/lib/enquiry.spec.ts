import { validateEnquiry } from './enquiry';

const valid = {
  name: 'Jane Traveller',
  email: 'jane@example.com',
  phone: '',
  message: 'July availability for 2 adults?',
};

test('valid input returns no errors', () => {
  expect(validateEnquiry(valid)).toEqual({});
});

test('blank name / message and bad email are flagged with i18n keys', () => {
  expect(validateEnquiry({ ...valid, name: '  ' })).toEqual({ name: 'nameRequired' });
  expect(validateEnquiry({ ...valid, email: 'not-an-email' })).toEqual({ email: 'emailInvalid' });
  expect(validateEnquiry({ ...valid, message: '' })).toEqual({ message: 'messageRequired' });
});

test('phone is optional', () => {
  expect(validateEnquiry({ ...valid, phone: '' })).toEqual({});
});
