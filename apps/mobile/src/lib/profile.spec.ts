import type { components } from '@tourism/core';
import { toProfileVm } from './profile';

type UserDto = components['schemas']['UserDto'];

test('maps name, phone, email, initial and avatarUrl', () => {
  const vm = toProfileVm({
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    phone: '+84901234567',
    avatarUrl: 'https://cdn/avatar.jpg',
  } as UserDto);
  expect(vm).toEqual({
    fullName: 'Jane Doe',
    phone: '+84901234567',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: 'https://cdn/avatar.jpg',
    hasPassword: false,
  });
});

test('falls back to the email initial when the name is null, phone/avatar null', () => {
  const vm = toProfileVm({
    email: 'zed@example.com',
    fullName: null,
    phone: null,
    avatarUrl: null,
  } as UserDto);
  expect(vm).toEqual({
    fullName: '',
    phone: '',
    email: 'zed@example.com',
    initial: 'Z',
    avatarUrl: null,
    hasPassword: false,
  });
});
