import { ApiRequestError } from '@tourism/core';
import { getApiClient } from './api';

/**
 * Runs an authed call, and if the API rejects it because this user has no
 * mirrored row yet, mirrors them and runs it once more.
 *
 * A signed-in user is only half signed in until `POST /auth/sync` lands. That
 * sync is fire-and-forget at sign-in, so any hiccup there (a dropped network, a
 * cold API) used to leave the account permanently 401ing: nothing re-synced on
 * boot, and the screens' own "Retry" buttons only repeated the failing fetch.
 * Wrapping the account-scoped reads/writes makes the recovery automatic — the
 * same idiom `createBooking` already used for the first authed write, now
 * behind every one of them.
 *
 * A bare 401 counts as unmirrored, not just `USER_NOT_SYNCED`: the API answers
 * with either depending on which guard rejects first. A genuinely invalid token
 * simply fails the retry too, so nothing is masked.
 *
 * Lives in its own module rather than next to `getApiClient` so that a test
 * mocking `./api` also intercepts the client this uses.
 */
export async function withUserSync<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (
      !(error instanceof ApiRequestError) ||
      (error.code !== 'USER_NOT_SYNCED' && error.status !== 401)
    ) {
      throw error;
    }
    await getApiClient().POST('/api/v1/auth/sync', { body: {} });
    return call();
  }
}
