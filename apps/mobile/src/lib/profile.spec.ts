import type { components } from '@tourism/core';
import { toProfileVm } from './profile';

type UserDto = components['schemas']['UserDto'];

test('maps name, phone, email and initial', () => {
  const vm = toProfileVm({
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    phone: '+84901234567',
  } as UserDto);
  expect(vm).toEqual({
    fullName: 'Jane Doe',
    phone: '+84901234567',
    email: 'jane@example.com',
    initial: 'J',
  });
});

test('falls back to the email initial when the name is null, phone empty when null', () => {
  const vm = toProfileVm({
    email: 'zed@example.com',
    fullName: null,
    phone: null,
  } as UserDto);
  expect(vm).toEqual({
    fullName: '',
    phone: '',
    email: 'zed@example.com',
    initial: 'Z',
  });
});
