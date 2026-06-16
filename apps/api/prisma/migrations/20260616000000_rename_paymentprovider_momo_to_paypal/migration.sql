-- Rename PaymentProvider enum value MOMO → PAYPAL.
-- ADR-0006 (amended 2026-06-16): PayPal replaces MoMo as the second rail — the
-- product targets inbound foreign tourists, who can't use a VN e-wallet. No rows
-- reference this value yet (bookings land in P1.5a), so a plain value rename is
-- safe and non-destructive (preserves the enum's other value, STRIPE).
ALTER TYPE "PaymentProvider" RENAME VALUE 'MOMO' TO 'PAYPAL';
