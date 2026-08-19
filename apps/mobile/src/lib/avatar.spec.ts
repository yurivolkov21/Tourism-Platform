const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
jest.mock('./api', () => ({
  getApiClient: () => ({ POST: mockPost, PUT: mockPut, DELETE: mockDelete }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import {
  removeAvatar,
  saveAvatar,
  signAvatarUpload,
  uploadAvatar,
  uploadAvatarImage,
} from './avatar';

const params = {
  signature: 'sig',
  timestamp: 1700000000,
  apiKey: 'key',
  cloudName: 'demo',
  folder: 'tourism/users/avatar',
  publicId: 'tourism/users/avatar/u1',
  resourceType: 'image',
  uploadUrl: 'https://api.cloudinary.com/v1_1/demo/image/upload',
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('signAvatarUpload unwraps the envelope', async () => {
  mockPost.mockResolvedValueOnce({ data: { data: params } });
  const result = await signAvatarUpload('photo.jpg', 'image/jpeg');
  expect(result).toEqual(params);
  expect(mockPost).toHaveBeenCalledWith('/api/v1/users/me/avatar/sign', {
    body: { filename: 'photo.jpg', contentType: 'image/jpeg' },
  });
});

test('uploadAvatarImage posts the signed multipart form to Cloudinary', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      public_id: params.publicId,
      format: 'jpg',
      width: 512,
    }),
  });
  const result = await uploadAvatarImage(params, {
    uri: 'file:///tmp/photo.jpg',
    name: 'photo.jpg',
    type: 'image/jpeg',
  });
  expect(result).toEqual({
    public_id: params.publicId,
    format: 'jpg',
    width: 512,
  });
  expect(mockFetch).toHaveBeenCalledWith(
    params.uploadUrl,
    expect.objectContaining({ method: 'POST' }),
  );
});

test('uploadAvatarImage throws when Cloudinary rejects the upload', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false });
  await expect(
    uploadAvatarImage(params, {
      uri: 'file:///tmp/photo.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
    }),
  ).rejects.toThrow();
});

test('saveAvatar PUTs the publicId and unwraps the profile', async () => {
  mockPut.mockResolvedValueOnce({
    data: {
      data: { email: 'jane@example.com', avatarUrl: 'https://cdn/avatar.jpg' },
    },
  });
  const dto = await saveAvatar('tourism/users/avatar/u1', 'jpg', 512);
  expect(dto.avatarUrl).toBe('https://cdn/avatar.jpg');
  expect(mockPut).toHaveBeenCalledWith('/api/v1/users/me/avatar', {
    body: { publicId: 'tourism/users/avatar/u1', format: 'jpg', width: 512 },
  });
});

test('removeAvatar DELETEs and unwraps the profile', async () => {
  mockDelete.mockResolvedValueOnce({
    data: { data: { email: 'jane@example.com', avatarUrl: null } },
  });
  const dto = await removeAvatar();
  expect(dto.avatarUrl).toBeNull();
});

test('uploadAvatar chains sign -> upload -> save', async () => {
  mockPost.mockResolvedValueOnce({ data: { data: params } });
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      public_id: params.publicId,
      format: 'jpg',
      width: 512,
    }),
  });
  mockPut.mockResolvedValueOnce({
    data: {
      data: { email: 'jane@example.com', avatarUrl: 'https://cdn/avatar.jpg' },
    },
  });
  const dto = await uploadAvatar({
    uri: 'file:///tmp/photo.jpg',
    name: 'photo.jpg',
    type: 'image/jpeg',
  });
  expect(dto.avatarUrl).toBe('https://cdn/avatar.jpg');
  expect(mockPut).toHaveBeenCalledWith('/api/v1/users/me/avatar', {
    body: { publicId: params.publicId, format: 'jpg', width: 512 },
  });
});
