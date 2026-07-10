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
export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<UserDto> {
  return authedJson<UserDto>('/api/v1/users/me', {
    method: 'PATCH',
    body: payload,
  });
}

/** Cloudinary signed-upload params for a customer avatar (`POST /users/me/avatar/sign`). */
export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  resourceType: string;
  uploadUrl: string;
}

/** Ask the API to sign an avatar upload (purpose pinned to USER_AVATAR server-side). */
export async function signAvatarUpload(
  filename: string,
  contentType?: string,
): Promise<SignedUploadParams> {
  return authedJson<SignedUploadParams>('/api/v1/users/me/avatar/sign', {
    method: 'POST',
    body: { filename, contentType },
  });
}

/** Attach an uploaded avatar by Cloudinary publicId (`PUT /users/me/avatar`). */
export async function setAvatar(
  publicId: string,
  format?: string,
  width?: number,
): Promise<UserDto> {
  return authedJson<UserDto>('/api/v1/users/me/avatar', {
    method: 'PUT',
    body: { publicId, format, width },
  });
}

/** Clear the caller's avatar (`DELETE /users/me/avatar`). */
export async function clearAvatar(): Promise<UserDto> {
  return authedJson<UserDto>('/api/v1/users/me/avatar', { method: 'DELETE' });
}

/** Delete the caller's account (`DELETE /users/me`). Throws `ApiRequestError` (409 if bookings exist). */
export async function deleteAccount(): Promise<void> {
  await authedJson<void>('/api/v1/users/me', { method: 'DELETE' });
}
