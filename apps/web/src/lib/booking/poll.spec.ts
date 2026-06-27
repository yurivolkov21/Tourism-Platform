import { MAX_CONFIRM_POLLS, confirmPollDelayMs, shouldKeepPolling } from './poll';

describe('confirmPollDelayMs', () => {
  it('starts at 2s and steps up every two attempts (gentle backoff)', () => {
    expect(confirmPollDelayMs(0)).toBe(2000);
    expect(confirmPollDelayMs(1)).toBe(2000);
    expect(confirmPollDelayMs(2)).toBe(3000);
    expect(confirmPollDelayMs(3)).toBe(3000);
    expect(confirmPollDelayMs(4)).toBe(4000);
  });

  it('caps the delay at 5s', () => {
    expect(confirmPollDelayMs(8)).toBe(5000);
    expect(confirmPollDelayMs(100)).toBe(5000);
  });
});

describe('shouldKeepPolling', () => {
  it('polls while under the cap and stops at it', () => {
    expect(shouldKeepPolling(0)).toBe(true);
    expect(shouldKeepPolling(MAX_CONFIRM_POLLS - 1)).toBe(true);
    expect(shouldKeepPolling(MAX_CONFIRM_POLLS)).toBe(false);
    expect(shouldKeepPolling(MAX_CONFIRM_POLLS + 1)).toBe(false);
  });

  it('honours a custom cap', () => {
    expect(shouldKeepPolling(3, 3)).toBe(false);
    expect(shouldKeepPolling(2, 3)).toBe(true);
  });
});
