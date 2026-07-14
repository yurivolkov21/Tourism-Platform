import { buildSystemPrompt } from './system-prompt';

describe('buildSystemPrompt', () => {
  const base = { todayISO: '2026-07-14' };

  it('carries the Nexora concierge persona and the current date', () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toContain('Nexora');
    expect(prompt).toContain('2026-07-14');
  });

  it('grounds answers in tool results only', () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toMatch(/only .*tool/i);
    expect(prompt).toMatch(/say so|admit/i);
  });

  it('forbids price promises and bookings, deferring to WhatsApp / booking flow', () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toMatch(/subject to availability/i);
    expect(prompt).toMatch(/never (promise|guarantee|confirm)/i);
    expect(prompt).toMatch(/WhatsApp/);
    expect(prompt).toMatch(/\/tours\//);
  });

  it('requires explicit consent before submitting an enquiry', () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toMatch(
      /(permission|consent|confirm).*(enquiry|submitEnquiry)/is,
    );
  });

  it('adds a personalization block only for a logged-in user with a name', () => {
    const anon = buildSystemPrompt(base);
    const named = buildSystemPrompt({
      ...base,
      user: { fullName: 'Alice Nguyen' },
    });
    expect(anon).not.toContain('Alice Nguyen');
    expect(named).toContain('Alice Nguyen');
    expect(named).toMatch(/logged in/i);
  });

  it('never leaks other-user or admin instructions into the prompt', () => {
    const prompt = buildSystemPrompt({ ...base, user: { fullName: null } });
    expect(prompt).not.toMatch(/service.role|SUPABASE|ANTHROPIC_API_KEY/i);
  });
});
