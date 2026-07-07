import type { components } from '@tourism/core';
import { getApiClient } from './api';

type UserDto = components['schemas']['UserDto'];

export interface ProfileVm {
  fullName: string;
  email: string;
  initial: string;
}

export function toProfileVm(dto: UserDto): ProfileVm {
  const fullName = dto.fullName ?? '';
  const source = fullName || dto.email;
  return { fullName, email: dto.email, initial: (source[0] ?? '?').toUpperCase() };
}

export async function fetchProfile(): Promise<ProfileVm> {
  const { data } = await getApiClient().GET('/api/v1/users/me');
  const dto = (data as unknown as { data?: UserDto } | undefined)?.data;
  if (!dto) throw new Error('empty profile response');
  return toProfileVm(dto);
}

export async function updateProfile(fullName: string): Promise<ProfileVm> {
  const { data } = await getApiClient().PATCH('/api/v1/users/me', {
    body: { fullName },
  });
  const dto = (data as unknown as { data?: UserDto } | undefined)?.data;
  if (!dto) throw new Error('empty profile response');
  return toProfileVm(dto);
}
