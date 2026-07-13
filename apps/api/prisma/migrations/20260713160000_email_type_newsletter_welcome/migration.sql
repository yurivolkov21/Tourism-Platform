-- API-W1: newsletter welcome email (first-subscribe only, deduped in outbox).
ALTER TYPE "EmailType" ADD VALUE 'NEWSLETTER_WELCOME';
