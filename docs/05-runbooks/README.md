# Runbooks

Operational how-tos (one file per task). Filled as the matching capability lands.

| Runbook | Covers | Status |
| --- | --- | --- |
| [local-dev](local-dev.md) | install/run the API, Nx command mapping (vs `start:dev`), reset/seed test data | ✅ |
| seed / reset | `nx run @tourism/api:seed` (demo data) · `:reset` (empty DB) — see [local-dev](local-dev.md#test-data) + [Postman README](../../apps/api/postman/README.md) | ✅ |
| [deploy](deploy.md) | free-tier deploy: Vercel (web+admin) · Render (API) · Supabase (DB) · keep-alive pinger · Cloudflare-tunnel fallback · upgrade-to-paid path | ✅ |
| [env-and-secrets](env-and-secrets.md) | which env var goes to Render vs Vercel · secret vs public · bulk-load (Render "Add from .env" / Vercel CLI) · Stripe webhook-secret gotcha | ✅ |
