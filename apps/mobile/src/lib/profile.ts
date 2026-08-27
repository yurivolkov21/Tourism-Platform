import type { components } from '@tourism/core';
import { getApiClient } from './api';
import { withUserSync } from './user-sync';
import type { UpdateProfilePayload } from './profile-form';

type UserDto = components['schemas']['UserDto'];

export interface ProfileVm {
  fullName: string;
  phone: string;
  email: string;
  initial: string;
  avatarUrl: string | null;
  /**
   * Whether the account can sign in with a password. Comes from the API, not
   * from `app_metadata.providers`: Supabase sets `encrypted_password` without
   * creating an `email` identity when a password is added to an OAuth-only
   * account, so the client-visible provider list never reflects it.
   */
  hasPassword: boolean;
}

export function toProfileVm(dto: UserDto): ProfileVm {
  const fullName = dto.fullName ?? '';
  const source = fullName || dto.email;
  return {
    fullName,
    phone: dto.phone ?? '',
    email: dto.email,
    initial: (source[0] ?? '?').toUpperCase(),
    avatarUrl: dto.avatarUrl ?? null,
    hasPassword: dto.hasPassword ?? false,
  };
}

export async function fetchProfile(): Promise<ProfileVm> {
  return withUserSync(async () => {
    const { data } = await getApiClient().GET('/api/v1/users/me');
    const dto = (data as unknown as { data?: UserDto } | undefined)?.data;
    if (!dto) throw new Error('empty profile response');
    return toProfileVm(dto);
  });
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<ProfileVm> {
  return withUserSync(async () => {
    const { data } = await getApiClient().PATCH('/api/v1/users/me', {
      body: payload,
    });
    const dto = (data as unknown as { data?: UserDto } | undefined)?.data;
    if (!dto) throw new Error('empty profile response');
    return toProfileVm(dto);
  });
}
