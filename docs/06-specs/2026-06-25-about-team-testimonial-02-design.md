# About team — Testimonial-02 layout + "Built with" logo cloud

**Status:** in review · **Date:** 2026-06-25 · **Branch:** `fix/about-team-testimonial-02`

Follow-up to the About real-data pass: the team section is re-laid out to faithfully
match the Shadcn Space **"Testimonial 02"** block (the user's preferred design),
and the block's brand-logo strip is repurposed honestly.

## Changes
- **Team** rebuilt to the Testimonial-02 layout: left-aligned badge + heading with
  the nav arrows top-right, one member per slide — a quote mark, a large bio, then
  name + role, beside a portrait column. Built on `@tourism/ui` Carousel + Badge +
  the existing `Reveal` (no `motion/react` dependency); brand-tokenized. Portraits
  are initials avatars until real photos land (`member.image` optional).
- **BuiltWith** (`built-with.tsx`) — the block's logo marquee repurposed as the
  project's **real tech stack** ("Built on a modern, production-grade stack":
  Next.js · NestJS · Supabase · Prisma · Stripe · PayPal · Cloudinary · Tailwind),
  not fabricated partner logos. Monochrome simpleicons (slate, light+dark variant)
  via a ported `Marquee` (pure-CSS, reduced-motion aware) with edge fades.
- `marquee.tsx` ported from the block (brand-agnostic, no deps). i18n gains
  `about.builtWith.caption`.

## Decisions (confirmed with the user)
- Adopt Testimonial-02's own header layout (replacing the previous centered one).
- Logo cloud = real "Built with" stack (honest), not placeholder/partner logos.
- No `motion/react` — reuse `Reveal` for the entrance feel.

## Verification
web jest 56, lint/build/no-hex green; built against the live API — team header,
real members, nav arrows, and the 8 real tech logos all render.
