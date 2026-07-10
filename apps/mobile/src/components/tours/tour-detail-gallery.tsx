import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { TourDetailData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import {
  FullscreenImageViewer,
  SectionHeader,
  useTheme,
} from '@tourism/mobile-ui';

import { RemoteImage } from '../remote-image';

type TourDetailGalleryProps = {
  tour: TourDetailData;
};

export function TourDetailGallery({ tour }: TourDetailGalleryProps) {
  const theme = useTheme();
  const urls = tour.gallery.filter(Boolean);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  if (urls.length === 0) return null;

  return (
    <View>
      <SectionHeader title={messages.tourDetail.gallery} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          gap: theme.spacing.sm,
        }}
      >
        {urls.map((uri, index) => (
          <Pressable
            key={`${uri}-${index}`}
            onPress={() => {
              setViewerIndex(index);
              setViewerOpen(true);
            }}
            accessibilityRole="button"
          >
            <RemoteImage uri={uri} style={styles.thumb(theme)} />
          </Pressable>
        ))}
      </ScrollView>
      <FullscreenImageViewer
        visible={viewerOpen}
        urls={urls}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = {
  thumb: (theme: ReturnType<typeof useTheme>) => ({
    width: 160,
    height: 110,
    borderRadius: theme.radius.md,
    overflow: 'hidden' as const,
  }),
};
