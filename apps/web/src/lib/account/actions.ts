'use server';

import { ApiRequestError } from '@tourism/core';

import {
  clearAvatar,
  deleteAccount as deleteAccountApi,
  setAvatar,
  signAvatarUpload,
  updateProfile,
  type SignedUploadParams,
  type UpdateProfilePayload,
} from '../api/profile';

export interface ProfileActionState {
  error?: string;
  saved?: boolean;
}

function errorOf(e: unknown, fallback: string): string {
  return e instanceof ApiRequestError ? e.message : fallback;
}

/** Persist the profile edit (`PATCH /users/me`). The client also syncs the Supabase display name. */
export async function saveProfile(
  payload: UpdateProfilePayload,
): Promise<ProfileActionState> {
  try {
    await updateProfile(payload);
  } catch (e) {
    return { error: errorOf(e, 'Could not save your profile.') };
  }
  return { saved: true };
}

/** Sign a Cloudinary avatar upload (the browser then uploads the bytes directly). */
export async function requestAvatarUpload(
  filename: string,
  contentType?: string,
): Promise<{ params?: SignedUploadParams; error?: string }> {
  try {
    return { params: await signAvatarUpload(filename, contentType) };
  } catch (e) {
    return { error: errorOf(e, 'Could not start the upload.') };
  }
}

/** Attach the uploaded avatar; returns the new delivery URL for the navbar. */
export async function saveAvatar(
  publicId: string,
  format?: string,
  width?: number,
): Promise<{ avatarUrl?: string | null; error?: string }> {
  try {
    const user = await setAvatar(publicId, format, width);
    return { avatarUrl: user.avatarUrl };
  } catch (e) {
    return { error: errorOf(e, 'Could not set your avatar.') };
  }
}

/** Remove the caller's avatar. */
export async function removeAvatar(): Promise<{ error?: string }> {
  try {
    await clearAvatar();
    return {};
  } catch (e) {
    return { error: errorOf(e, 'Could not remove your avatar.') };
  }
}

/** Delete the caller's account (the client then signs out + leaves). 409 → has-bookings message. */
export async function deleteAccount(): Promise<{ error?: string }> {
  try {
    await deleteAccountApi();
    return {};
  } catch (e) {
    return { error: errorOf(e, 'Could not delete your account.') };
  }
}
