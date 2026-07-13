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
- **Don't remove `{{ .ConfirmationURL }}`** — it's the action link Supabase injects (button href + the
  copy-paste fallback). Other vars available: `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .Token }}`.
- Keep the layout in sync across the three files if you restyle (they share one shell).

## Production note

While on the Supabase **default** email service these still send from `…@mail.app.supabase.io` and are
rate-limited / spam-prone. For production, point Supabase at **Resend via Custom SMTP** (needs a
verified sending domain) — see the env-and-secrets runbook. The HTML here works the same either way.
