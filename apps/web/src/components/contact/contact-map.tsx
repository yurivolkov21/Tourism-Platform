'use client';

import { MapPinIcon } from 'lucide-react';

import { Map, MapMarker, MarkerContent, MapControls } from '@tourism/ui';

// Hà Nội office — 18 Tam Trinh, Tương Mai (VTC Online building).
const HANOI: [number, number] = [105.8606, 20.9895];

// Free, no-API-key vector tiles (OpenStreetMap data) instead of mapcn's default
// CARTO basemap (which needs a commercial licence). Theme-aware light/dark.
const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

/**
 * MapLibre map of Hà Nội (mapcn). Client + MapLibre/WebGL only — loaded via a
 * dynamic(ssr:false) wrapper. Lightly interactive: drag + zoom buttons, but
 * scroll-zoom is off so it never hijacks page scrolling.
 */
export default function ContactMap() {
  return (
    <Map
      center={HANOI}
      zoom={12.5}
      styles={STYLES}
      scrollZoom={false}
      dragRotate={false}
      className="size-full"
    >
      <MapControls position="bottom-right" showZoom />
      <MapMarker longitude={HANOI[0]} latitude={HANOI[1]}>
        <MarkerContent>
          <span className="relative flex size-9 items-center justify-center">
            <span className="bg-primary/50 absolute inline-flex size-full animate-ping rounded-full motion-reduce:hidden" />
            <span className="bg-primary text-primary-foreground ring-background relative flex size-9 items-center justify-center rounded-full shadow-md ring-2">
              <MapPinIcon className="size-4.5" />
            </span>
          </span>
        </MarkerContent>
      </MapMarker>
    </Map>
  );
}
