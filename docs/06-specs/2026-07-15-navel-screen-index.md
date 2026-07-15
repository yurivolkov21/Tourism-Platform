# Navel reference-screen index (`.png/navel/`, 102 exports)

> Lookup table for the P5.7 screen-by-screen program. The exports themselves
> are gitignored (licensed kit — inspiration only); this index is ours.
> 51 dark/light twin PAIRS, matched by content (NOT by fixed number offset —
> two pairs are order-swapped between themes; see notes).

Dark = Screen.png + Screen-1..50 · Light = Screen-51..101.
Twin rule of thumb: light ≈ dark + 51, EXCEPT: 29↔81, 30↔80, 40↔92, 41↔91.

| Dark | Light | Type | Screen |
| --- | --- | --- | --- |
| Screen.png | 51 | splash | Navel logo splash |
| 1 | 52 | onboarding | 1/3 "Explore the beauty" |
| 2 | 53 | onboarding | 2/3 "dream travel" + Sign Up |
| 3 | 54 | onboarding | 3/3 "Enjoy your travel experience" |
| 4 | 55 | login | empty form |
| 5 | 56 | login | prefilled |
| 6 | 57 | login | validation errors |
| 7 | 58 | forgot | contact-method picker |
| 8 | 59 | forgot | 4-digit OTP |
| 9 | 60 | forgot | reset password |
| 10 | 61 | register | empty form |
| 11 | 62 | register | prefilled |
| 12 | 63 | register | verify-identity OTP |
| 13 | 64 | terms | Terms of Service |
| 14 | 65 | register | account setup (avatar+username) |
| 15 | 66 | register | username-taken error |
| 16 | 67 | register | Register Complete (glow) |
| 17 | 68 | home | Destination tab (vertical tabs) |
| 18 | 69 | home | Countries tab |
| 19 | 70 | home | Cities tab + keyboard |
| 20 | 71 | home | Countries: Indonesia |
| 21 | 72 | search | not-found empty |
| 22 | 73 | filter | filter sheet (view/loc/price/rating/range) |
| 23 | 74 | listing | results "Found 90+" |
| 24 | 75 | listing | stacked result cards |
| 25 | 76 | listing | country detail — Cities tab |
| 26 | 77 | listing | country detail — Destination tab |
| 27 | 78 | listing | city detail (Bali) |
| 28 | 79 | tour-detail | History tab + rail + sticky CTA |
| 29 | 81 | tour-detail | History tab (Machu Picchu) |
| 30 | 80 | tour-detail | Location tab (map) |
| 31 | 82 | reviews | review list + star filter |
| 32 | 83 | gallery | review-photo viewer |
| 33 | 84 | gallery | masonry grid |
| 34 | 85 | gallery | fullscreen pager |
| 35 | 86 | video | video tab thumb |
| 36 | 87 | video | fullscreen player |
| 37 | 88 | booking-step | Create Booking (dates/slider/type) |
| 38 | 89 | payment | card-stack select payment |
| 39 | 90 | confirmation | Booking Success (glow) |
| 40 | 92 | search | typing + suggestion chips |
| 41 | 91 | map-explore | nearby map + route |
| 42 | 93 | map-explore | "too far" toast |
| 43 | 94 | search | not-found (explore variant) |
| 44 | 95 | map-explore | POI pins "Found 10+" |
| 45 | 96 | wishlist | bookmark empty |
| 46 | 97 | wishlist | bookmark filled |
| 47 | 98 | profile | account menu |
| 48 | 99 | trips | booking list w/ status badges |
| 49 | 100 | booking-detail | key-value detail + FAQ |
| 50 | 101 | confirmation | Booking Cancelled (red glow) |

Notes: kit content anomaly — Machu Picchu Location price differs between
themes ($720 dark / $145 light); ignore, asset bug in the kit.

Onboarding flow order (wave 1 reference): splash → 1 → 2 → 3 → auth (4/10)
→ home 17. Nexora adaptation (locked 2026-07-15): onboarding shows on FIRST
launch only → last page offers "Sign in / Explore as guest" → Home
(guest-first preserved; auth never blocks).
