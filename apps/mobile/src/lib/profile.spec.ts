import type { components } from '@tourism/core';
import { toProfileVm } from './profile';

type UserDto = components['schemas']['UserDto'];

test('maps name, email and initial', () => {
  const vm = toProfileVm({ email: 'jane@example.com', fullName: 'Jane Doe' } as UserDto);
  expect(vm).toEqual({ fullName: 'Jane Doe', email: 'jane@example.com', initial: 'J' });
});

test('falls back to the email initial when the name is null', () => {
  const vm = toProfileVm({ email: 'zed@example.com', fullName: null } as UserDto);
  expect(vm).toEqual({ fullName: '', email: 'zed@example.com', initial: 'Z' });
});
