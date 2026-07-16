import { EmailService } from './email.service';

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

interface ConfigStub {
  getOrThrow: (key: string) => string;
  get: (key: string) => string | undefined;
}

const makeService = (env: Record<string, string | undefined>): EmailService => {
  const config: ConfigStub = {
    getOrThrow: (key: string) => {
      const v = env[key];
      if (v === undefined) throw new Error(`missing ${key}`);
      return v;
    },
    get: (key: string) => env[key],
  };
  // Constructor only stores the config; onModuleInit reads it.
  const svc = new EmailService(config as never);
  svc.onModuleInit();
  return svc;
};

const baseEnv = {
  'email.resendApiKey': 're_test',
  'email.fromEmail': 'Nexora <noreply@nexora-travel.agency>',
};

const bookingVars = {
  code: 'BK-1',
  tourTitle: 'Tour',
  contactName: 'Jane',
  totalAmount: '10.00',
  currency: 'USD',
  numAdults: 1,
  numChildren: 0,
  startDate: null,
  endDate: null,
  tourImageUrl: null,
  tourImageAlt: null,
  manageUrl: 'https://web/account/bookings',
};

beforeEach(() => {
  mockSend.mockReset();
  mockSend.mockResolvedValue({ data: { id: 'em_1' }, error: null });
});

describe('EmailService reply-to (API-W1)', () => {
  it('passes replyTo on every send when configured', async () => {
    const svc = makeService({
      ...baseEnv,
      'email.replyTo': 'support@example.com',
    });

    await svc.sendBookingConfirmation({ to: 'a@b.co', vars: bookingVars });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'support@example.com' }),
    );
  });

  it('omits the replyTo key entirely when not configured', async () => {
    const svc = makeService(baseEnv);

    await svc.sendBookingConfirmation({ to: 'a@b.co', vars: bookingVars });

    const payload = mockSend.mock.calls[0][0] as Record<string, unknown>;
    expect('replyTo' in payload).toBe(false);
  });
});

describe('EmailService new senders (API-W1)', () => {
  it('sends the email-changed notice to the given (old) address', async () => {
    const svc = makeService(baseEnv);
    await svc.sendEmailChangedNotice({
      to: 'old@b.co',
      vars: {
        newEmail: 'new@b.co',
        supportUrl: 'https://web/contact',
        manageUrl: 'https://web/account',
      },
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'old@b.co',
        subject: 'Your Nexora email was changed',
      }),
    );
  });

  it('sends the cancellation-requested email', async () => {
    const svc = makeService(baseEnv);
    await svc.sendCancellationRequested({
      to: 'a@b.co',
      vars: { code: 'BK-1', tourTitle: 'Tour', contactName: 'Jane' },
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "We're reviewing your cancellation request — BK-1",
      }),
    );
  });

  it('sends the cancellation-denied email', async () => {
    const svc = makeService(baseEnv);
    await svc.sendCancellationDenied({
      to: 'a@b.co',
      vars: {
        code: 'BK-1',
        contactName: 'Jane',
        decisionNote: 'Too close to departure.',
        manageUrl: 'https://web/account/bookings',
      },
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'About your cancellation request — BK-1',
      }),
    );
  });

  it('sends the newsletter welcome email', async () => {
    const svc = makeService(baseEnv);
    await svc.sendNewsletterWelcome({
      to: 'a@b.co',
      vars: { journalUrl: 'https://web/blog' },
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Welcome to the Nexora Journal' }),
    );
  });

  it('still throws when Resend rejects (worker retry contract)', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'invalid from' },
    });
    const svc = makeService(baseEnv);
    await expect(
      svc.sendNewsletterWelcome({
        to: 'a@b.co',
        vars: { journalUrl: 'https://web/blog' },
      }),
    ).rejects.toThrow('invalid from');
  });
});
