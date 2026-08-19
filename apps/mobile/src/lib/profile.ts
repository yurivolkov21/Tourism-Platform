import type { components } from '@tourism/core';
import { getApiClient } from './api';
import type { UpdateProfilePayload } from './profile-form';

type UserDto = components['schemas']['UserDto'];

export interface ProfileVm {
  fullName: string;
  phone: string;
  email: string;
  initial: string;
}

export function toProfileVm(dto: UserDto): ProfileVm {
  const fullName = dto.fullName ?? '';
  const source = fullName || dto.email;
  return {
    fullName,
    phone: dto.phone ?? '',
    email: dto.email,
    initial: (source[0] ?? '?').toUpperCase(),
  };
}

export async function fetchProfile(): Promise<ProfileVm> {
  const { data } = await getApiClient().GET('/api/v1/users/me');
  const dto = (data as unknown as { data?: UserDto } | undefined)?.data;
  if (!dto) throw new Error('empty profile response');
  return toProfileVm(dto);
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<ProfileVm> {
  const { data } = await getApiClient().PATCH('/api/v1/users/me', {
    body: payload,
  });
  const dto = (data as unknown as { data?: UserDto } | undefined)?.data;
  if (!dto) throw new Error('empty profile response');
  return toProfileVm(dto);
}
