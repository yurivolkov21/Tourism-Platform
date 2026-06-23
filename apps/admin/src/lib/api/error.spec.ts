import { apiErrorMessage } from './error';

const apiError = (status: number, message = 'msg') => ({
  name: 'ApiRequestError',
  status,
  code: 'X',
  message,
});

describe('apiErrorMessage', () => {
  it('maps 403 to a not-authorized message', () => {
    expect(apiErrorMessage(apiError(403))).toBe(
      'Your account is not authorized for the admin console.',
    );
  });

  it('maps 401 to a session-expired message', () => {
    expect(apiErrorMessage(apiError(401))).toContain('session');
  });

  it('surfaces the server message on 409 conflict', () => {
    expect(apiErrorMessage(apiError(409, 'Slug already exists'))).toBe('Slug already exists');
  });

  it('maps 404', () => {
    expect(apiErrorMessage(apiError(404))).toBe('That record no longer exists.');
  });

  it('falls back to the raw message for plain errors', () => {
    expect(apiErrorMessage(new Error('network down'))).toBe('network down');
  });

  it('falls back for unknown values', () => {
    expect(apiErrorMessage(undefined)).toBe('The request failed. Please try again.');
  });
});
