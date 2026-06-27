'use server';

import { ApiRequestError } from '@tourism/core';

import { updateProfile, type UpdateProfilePayload } from '../api/profile';

export interface ProfileActionState {
  error?: string;
  saved?: boolean;
}

/** Persist the profile edit (`PATCH /users/me`). The client also syncs the Supabase display name. */
export async function saveProfile(payload: UpdateProfilePayload): Promise<ProfileActionState> {
  try {
    await updateProfile(payload);
  } catch (e) {
    return { error: e instanceof ApiRequestError ? e.message : 'Could not save your profile.' };
  }
  return { saved: true };
}
