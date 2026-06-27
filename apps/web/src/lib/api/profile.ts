import type { components } from '@tourism/core';

import { authedJson } from './authed';

export type UserDto = components['schemas']['UserDto'];
export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
}

/** The signed-in customer's profile (`GET /users/me`). `null` on error / not-synced. */
export async function fetchProfile(): Promise<UserDto | null> {
  try {
    return await authedJson<UserDto>('/api/v1/users/me', { method: 'GET' });
  } catch {
    return null;
  }
}

/** Update the caller's profile (`PATCH /users/me`). Throws `ApiRequestError` on failure. */
export async function updateProfile(payload: UpdateProfilePayload): Promise<UserDto> {
  return authedJson<UserDto>('/api/v1/users/me', { method: 'PATCH', body: payload });
}
