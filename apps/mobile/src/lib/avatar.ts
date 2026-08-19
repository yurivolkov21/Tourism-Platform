import type { components } from '@tourism/core';
import { getApiClient } from './api';

type UserDto = components['schemas']['UserDto'];

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

export interface AvatarFile {
  uri: string;
  name: string;
  type: string;
}

interface CloudinaryUploadResult {
  public_id: string;
  format?: string;
  width?: number;
}

/** Ask the API to sign an avatar upload (purpose pinned to USER_AVATAR server-side). */
export async function signAvatarUpload(
  filename: string,
  contentType?: string,
): Promise<SignedUploadParams> {
  const { data } = await getApiClient().POST('/api/v1/users/me/avatar/sign', {
    body: { filename, contentType },
  });
  const params = (data as unknown as { data?: SignedUploadParams } | undefined)
    ?.data;
  if (!params) throw new Error('empty sign response');
  return params;
}

/** Upload the picked image straight to Cloudinary using the signed params. */
export async function uploadAvatarImage(
  params: SignedUploadParams,
  file: AvatarFile,
): Promise<CloudinaryUploadResult> {
  const form = new FormData();
  // React Native's FormData accepts { uri, name, type } in place of a Blob.
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  form.append('api_key', params.apiKey);
  form.append('timestamp', String(params.timestamp));
  form.append('signature', params.signature);
  form.append('folder', params.folder);
  form.append('public_id', params.publicId);

  const res = await fetch(params.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) throw new Error('avatar upload failed');
  return res.json() as Promise<CloudinaryUploadResult>;
}

/** Attach an uploaded avatar by Cloudinary publicId (`PUT /users/me/avatar`). */
export async function saveAvatar(
  publicId: string,
  format?: string,
  width?: number,
): Promise<UserDto> {
  const { data } = await getApiClient().PUT('/api/v1/users/me/avatar', {
    body: { publicId, format, width },
  });
  const dto = (data as unknown as { data?: UserDto } | undefined)?.data;
  if (!dto) throw new Error('empty avatar response');
  return dto;
}

/** Clear the caller's avatar (`DELETE /users/me/avatar`). */
export async function removeAvatar(): Promise<UserDto> {
  const { data } = await getApiClient().DELETE('/api/v1/users/me/avatar');
  const dto = (data as unknown as { data?: UserDto } | undefined)?.data;
  if (!dto) throw new Error('empty avatar response');
  return dto;
}

/** Sign, upload to Cloudinary, then attach — the whole flow behind one picked file. */
export async function uploadAvatar(file: AvatarFile): Promise<UserDto> {
  const params = await signAvatarUpload(file.name, file.type);
  const uploaded = await uploadAvatarImage(params, file);
  return saveAvatar(uploaded.public_id, uploaded.format, uploaded.width);
}
