# Contact "Where we're based" — mapcn (MapLibre) full-bleed map

**Status:** in review · **Date:** 2026-06-25 · **Branch:** `feat/contact-map-mapcn`

Replace the plain Google-Maps `<iframe>` of Hoàn Kiếm with a styled, themed
MapLibre map of Hà Nội via **mapcn**, in a full-bleed layout with a floating
info card.

## Integration
- Added the **`@mapcn`** registry to `libs/web/ui/components.json`
  (`https://www.mapcn.dev/r/{name}.json`) and installed `@mapcn/map` → vendored
  `components/ui/map.tsx` + `maplibre-gl` dep + popup-reset CSS in globals. Map
  components re-exported from `@tourism/ui`.
- **Tiles:** OpenFreeMap free vector styles (`positron` light / `dark` dark) via
  the `styles` prop, instead of mapcn's default CARTO basemap (commercial
  licence) — no API key, OSM data, theme-aware.
- **Perf:** MapLibre is heavy + WebGL/client-only, so:
  - `ContactMap` (the `<Map>`) is loaded with `next/dynamic(..., { ssr: false })`;
  - `ContactLocation` only mounts it once the section scrolls into view
    (IntersectionObserver, 200px rootMargin) — the maplibre chunk never loads for
    visitors who don't reach it;
  - `@tourism/ui` `package.json` gains `"sideEffects": ["**/*.css"]` so `map.tsx`
    (whose top-level maplibre CSS import would otherwise pin it into every page)
    tree-shakes out of pages that don't use the map.
- **Types:** `@types/geojson` added (root + ui lib) and `geojson` added to the
  app + ui-lib tsconfig `types` (maplibre's types reference the global `GeoJSON`
  namespace). The vendored `map.tsx` carried `react-hooks/exhaustive-deps`
  disable directives for a rule this repo doesn't register — stripped them (the
  rule isn't active, so they were hard errors).

## Design
`ContactLocation` ("Where we're based"): heading/subtitle, then a full-bleed
rounded map (h-460/520) with `ContactMap` filling it and a **floating glass info
card** (`bg-background/85 backdrop-blur`, bottom on mobile / top-left on desktop):
city, lines, hours, "Open in Maps". Marker = a brand pin with a pulsing ring
(reduced-motion aware). Map is **lightly interactive**: drag + zoom buttons, but
`scrollZoom={false}` / `dragRotate={false}` so it never hijacks page scroll.
Replaces the old `ContactInfo` (deleted).

## Verification
web jest 58, `@tourism/ui` + web lint clean, web build green (GeoJSON resolved,
SSG intact), no-hex OK; contact page renders the section + floating card (map
mounts client-side on scroll). Confirmed against the live API.
