-- AlterEnum
-- Email-change security notice to the OLD address
-- (spec: docs/06-specs/2026-07-16-email-change-notify-reauth-design.md).
ALTER TYPE "EmailType" ADD VALUE 'EMAIL_CHANGED';
