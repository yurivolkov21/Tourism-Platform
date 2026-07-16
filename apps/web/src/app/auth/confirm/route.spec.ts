import type { NextRequest } from 'next/server';

import { GET } from './route';

const mockVerifyOtp = jest.fn();
const mockSyncUser = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: { redirect: (url: unknown) => ({ location: String(url) }) },
}));
jest.mock('../../../lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({ auth: { verifyOtp: mockVerifyOtp } })),
}));
jest.mock('../../../lib/auth/sync-user', () => ({
  syncUser: (...args: unknown[]) => mockSyncUser(...args),
}));

const ORIGIN = 'https://app.test';

function req(search: string): NextRequest {
  return {
    nextUrl: { searchParams: new URLSearchParams(search), origin: ORIGIN },
  } as unknown as NextRequest;
}

async function locationOf(search: string): Promise<string> {
  const res = (await GET(req(search))) as unknown as { location: string };
  return res.location;
}

describe('GET /auth/confirm', () => {
  beforeEach(() => {
    mockVerifyOtp.mockReset();
    mockSyncUser.mockReset().mockResolvedValue(true);
  });

  it('bounces to /login?error=auth when token_hash is missing (no verifyOtp)', async () => {
    expect(await locationOf('type=email_change&redirect=/account')).toBe(
      `${ORIGIN}/login?error=auth`,
    );
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('bounces to /login?error=auth on an unknown type', async () => {
    expect(await locationOf('token_hash=abc&type=magiclink')).toBe(
      `${ORIGIN}/login?error=auth`,
    );
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('bounces to /login?error=auth when verifyOtp errors (no sync)', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'expired' } });
    expect(
      await locationOf('token_hash=abc&type=email_change&redirect=/account'),
    ).toBe(`${ORIGIN}/login?error=auth`);
    expect(mockSyncUser).not.toHaveBeenCalled();
  });

  it('verifies, syncs, and redirects to the target on success', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    const location = await locationOf(
      'token_hash=abc&type=email_change&redirect=/account',
    );
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: 'email_change',
      token_hash: 'abc',
    });
    expect(mockSyncUser).toHaveBeenCalledTimes(1);
    expect(location).toBe(`${ORIGIN}/account`);
  });

  it('routes recovery confirmations to /reset-password', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    expect(
      await locationOf('token_hash=abc&type=recovery&redirect=/reset-password'),
    ).toBe(`${ORIGIN}/reset-password`);
  });

  it('falls back to /account when the redirect is unsafe (open-redirect guard)', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    expect(
      await locationOf(
        'token_hash=abc&type=signup&redirect=//evil.example.com',
      ),
    ).toBe(`${ORIGIN}/account`);
  });

  it('does not carry token_hash/type into the redirect URL', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    const location = await locationOf(
      'token_hash=secret-token&type=email_change&redirect=/account',
    );
    expect(location).not.toContain('secret-token');
    expect(location).not.toContain('token_hash');
  });
});
