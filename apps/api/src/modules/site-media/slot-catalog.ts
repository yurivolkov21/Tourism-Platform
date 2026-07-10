/**
 * Brand-chrome slot catalog — the single source of which site-media slots exist,
 * their kind (single image vs sorted gallery), and how the admin groups/labels
 * them. The DB (`site_media_slots`, seeded by migration) only pins a uuid per key
 * so assets can live in `media_assets` (ownerType=SITE). Adding a slot = add it
 * here + seed its key in a migration + consume it on the web with a fallback.
 */

export type SiteSlotKind = 'single' | 'gallery';

export interface SiteSlotDef {
  key: string;
  kind: SiteSlotKind;
  /** Admin-facing label. */
  label: string;
  /** Admin page grouping (section heading). */
  group: string;
  /** Admin-facing hint about where the image shows. */
  hint: string;
}

export const GALLERY_MAX = 8;

export const SITE_SLOTS: readonly SiteSlotDef[] = [
  {
    key: 'home-hero',
    kind: 'single',
    label: 'Hero backdrop',
    group: 'Home',
    hint: 'Full-bleed photo behind the home-page hero heading and search.',
  },
  {
    key: 'home-experiences',
    kind: 'single',
    label: 'Experiences backdrop',
    group: 'Home',
    hint: 'Background of the "Browse by experience" band.',
  },
  {
    key: 'home-why-choose',
    kind: 'single',
    label: 'Why-choose photo',
    group: 'Home',
    hint: 'The tall photo beside the "Why choose" points.',
  },
  {
    key: 'home-trust',
    kind: 'single',
    label: 'Trust section photo',
    group: 'Home',
    hint: 'Photo in the trust/assurance section.',
  },
  {
    key: 'cta-band',
    kind: 'single',
    label: 'CTA band backdrop',
    group: 'Shared',
    hint: 'Default backdrop of the "Plan your trip" call-to-action band.',
  },
  {
    key: 'content-hero',
    kind: 'single',
    label: 'Content pages hero',
    group: 'Shared',
    hint: 'Default hero for FAQ, Privacy and Terms.',
  },
  {
    key: 'destinations-hero',
    kind: 'single',
    label: 'Destinations hero',
    group: 'Destinations',
    hint: 'Hero photo of the /destinations overview page.',
  },
  {
    key: 'auth-panel',
    kind: 'single',
    label: 'Auth panel photo',
    group: 'Auth',
    hint: 'Side panel photo on sign-in / register / password pages.',
  },
  {
    key: 'about-story',
    kind: 'gallery',
    label: 'Our-story milestones',
    group: 'About',
    hint: 'One photo per story milestone on the About page, in order (up to 8).',
  },
];

export function slotDef(key: string): SiteSlotDef | undefined {
  return SITE_SLOTS.find((s) => s.key === key);
}
