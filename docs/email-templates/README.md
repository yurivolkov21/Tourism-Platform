# Auth email templates (Supabase)

Branded HTML for the Supabase **Auth** emails (sign-up confirm, password reset, email change). These
are the emails Supabase sends from its own service — separate from the app's Resend transactional
emails (booking/enquiry). Versioned here; **applied by pasting into the Supabase dashboard**.

## Where to paste

Supabase → **Authentication → Emails → Templates**. For each template: paste the file's HTML into the
**Message body**, set the **Subject** (from the comment at the top of each file), then **Save**.

| File | Supabase template | Subject |
| --- | --- | --- |
| [confirm-signup.html](confirm-signup.html) | Confirm signup | `Confirm your Nexora account` |
| [reset-password.html](reset-password.html) | Reset Password | `Reset your Nexora password` |
| [change-email.html](change-email.html) | Change Email Address | `Confirm your new Nexora email` |

(Magic Link / Invite / Reauthentication aren't used by the app — leave them default, or reuse a
template by swapping the heading + button label.)

## Design notes

- **v2 shell (API-W1, 2026-07-13):** a port of react.email's "Barebone" template
  (MIT) — gray page `#f3f4f6` → white 640px frame → centered gray content card
  (48px "N" monogram · 28px/600 heading · 16px body · emerald button) → footer.
  Same system as the app's Resend templates
  (`apps/api/src/modules/email/email.templates.ts`) — keep the two in sync.
- **Email-safe only:** table layout + inline CSS; font = Inter webfont
  (gstatic @font-face, the react.email approach) with `'Segoe UI', Arial`
  fallback; brand hex hardcoded (`#2f6b4f` emerald, ink `#14171e`/`#43454b`/
  `#7b7d81`) — the app's oklch tokens don't exist in an inbox. The no-hex rule
  applies to app CSS, not these pasted templates.
- **Action link uses `{{ .TokenHash }}`, NOT `{{ .ConfirmationURL }}`** (2026-07-16).
  The button href + copy-paste fallback point at the app's own server route so
  confirmation completes **cross-browser** (the default `{{ .ConfirmationURL }}` →
  Supabase hosted verify → `/auth/callback` PKCE flow breaks when the link is
  opened in a different browser/mail-client). Each file links to `/auth/confirm`
  with its own `type` (`&` kept raw so the copy-paste URL stays valid):
  - `confirm-signup.html` → `type=signup&redirect=/account`
  - `reset-password.html` → `type=recovery&redirect=/reset-password`
  - `change-email.html` → `type=email_change&redirect=/account`
  Other vars available: `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .Token }}`. OAuth is
  unaffected (still `/auth/callback`).
- **Redirect URLs:** Supabase → Auth → URL Configuration must allow
  `…/auth/confirm` (keep `/auth/callback` for OAuth), else the link is rejected.
- Keep the layout in sync across the three files if you restyle (they share one shell).

## Production note

**Done 2026-07-13:** Supabase sends through **Resend via Custom SMTP** (sender
`noreply@nexora-travel.agency`, host `smtp.resend.com` — see
[deploy §5b](../05-runbooks/deploy.md)), so auth emails come from the verified
domain instead of the rate-limited `…@mail.app.supabase.io` default. Custom
SMTP is also what UNLOCKS template editing — Supabase's 2026 policy blocks it
on the default email service for new free-tier projects. These 3 templates are
pasted into the dashboard; re-paste after any edit here.
