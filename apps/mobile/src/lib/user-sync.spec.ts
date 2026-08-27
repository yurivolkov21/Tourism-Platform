import { ApiRequestError } from '@tourism/core';
import { getApiClient } from './api';
import { withUserSync } from './user-sync';

jest.mock('./api', () => ({ getApiClient: jest.fn() }));

const mockGetApiClient = getApiClient as jest.MockedFunction<
  typeof getApiClient
>;

function mockClient(): { POST: jest.Mock } {
  const client = { POST: jest.fn().mockResolvedValue({}) };
  mockGetApiClient.mockReturnValue(client as never);
  return client;
}

beforeEach(() => jest.clearAllMocks());

test('passes a successful call straight through without syncing', async () => {
  const client = mockClient();
  const call = jest.fn().mockResolvedValue('ok');

  await expect(withUserSync(call)).resolves.toBe('ok');
  expect(call).toHaveBeenCalledTimes(1);
  expect(client.POST).not.toHaveBeenCalled();
});

test('re-syncs the user mirror once, then retries, on USER_NOT_SYNCED', async () => {
  const client = mockClient();
  const call = jest
    .fn()
    .mockRejectedValueOnce(
      new ApiRequestError(401, { code: 'USER_NOT_SYNCED', message: 'nope' }),
    )
    .mockResolvedValueOnce('ok');

  await expect(withUserSync(call)).resolves.toBe('ok');
  expect(client.POST).toHaveBeenCalledWith('/api/v1/auth/sync', { body: {} });
  expect(call).toHaveBeenCalledTimes(2);
});

test('treats a bare 401 as the unmirrored-user case too', async () => {
  // Which of the two the API answers with depends on the guard that rejects first.
  const client = mockClient();
  const call = jest
    .fn()
    .mockRejectedValueOnce(
      new ApiRequestError(401, { code: 'UNAUTHORIZED', message: 'nope' }),
    )
    .mockResolvedValueOnce('ok');

  await expect(withUserSync(call)).resolves.toBe('ok');
  expect(client.POST).toHaveBeenCalled();
  expect(call).toHaveBeenCalledTimes(2);
});

test('does not retry — or sync — on any other failure', async () => {
  const client = mockClient();
  const boom = new ApiRequestError(409, {
    code: 'ACCOUNT_HAS_BOOKINGS',
    message: 'nope',
  });
  const call = jest.fn().mockRejectedValue(boom);

  await expect(withUserSync(call)).rejects.toBe(boom);
  expect(client.POST).not.toHaveBeenCalled();
  expect(call).toHaveBeenCalledTimes(1);
});

test('a second failure after re-syncing is surfaced, not swallowed', async () => {
  mockClient();
  const boom = new ApiRequestError(401, {
    code: 'UNAUTHORIZED',
    message: 'nope',
  });
  const call = jest.fn().mockRejectedValue(boom);

  await expect(withUserSync(call)).rejects.toBe(boom);
  expect(call).toHaveBeenCalledTimes(2);
});
