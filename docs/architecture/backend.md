# Backend (apps/api)

NestJS service. Mirrors the donor's proven structure (port + adapt to the new schema).

> Skeleton — fill as modules land (P1).

## Module map

```text
common/   guards · interceptors (envelope) · filters · decorators · types
config/   Joi env validation + namespaced registerAs (app/supabase/stripe/email/cloudinary/throttler)
prisma/   PrismaService (PrismaPg adapter) + prisma.config.ts (DIRECT_URL migrations)
modules/  auth · users · destinations · tours(+itinerary) · departures · bookings ·
          payments(stripe) · reviews · wishlist · media · uploads · email · admin-stats · health
          + NEW: enquiry
```

## Request lifecycle

📝 *guard → interceptor → filter (envelope) flow — fill in P1.2/P1.3.*

## Port checklist (from donor)

See [../../HANDOFF.md](../../HANDOFF.md) §"Donor code worth porting" for exact paths.
Envelope · SupabaseJwtGuard/RolesGuard · Stripe webhook idempotency · Joi env ·
PrismaPg adapter + pooler · Resend email · Cloudinary media.
