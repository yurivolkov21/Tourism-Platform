import { useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@tourism/mobile-ui';

const HERO_HEIGHT = 420;
const RAIL_THUMBS = 3;

/**
 * P5.6 full-bleed hero pager: edge-to-edge swipeable gallery with the brand
 * grade tint + bottom scrim (same recipe as ScrimImage), an `overlay` slot
 * for the title block, and a vertical thumbnail rail (Navel Screen-28) that
 * jumps the pager. Swipes keep working — every treatment layer is
 * pointerEvents="none" except the rail.
 */
export function GalleryPager({
  images,
  title,
  overlay,
}: {
  images: string[];
  title: string;
  overlay?: ReactNode;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const railImages = images.slice(0, RAIL_THUMBS);
  const overflow = images.length - RAIL_THUMBS;

  return (
    <View style={{ height: HERO_HEIGHT }}>
      {images.length === 0 ? (
        <View
          style={{
            width: '100%',
            height: HERO_HEIGHT,
            backgroundColor: theme.colors['muted'],
          }}
        />
      ) : (
        <FlatList
          ref={listRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={images}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={{
                width,
                height: HERO_HEIGHT,
                backgroundColor: theme.colors['muted'],
              }}
              contentFit="cover"
              transition={200}
              accessibilityLabel={title}
            />
          )}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
        />
      )}

      {/* Brand grade tint + bottom legibility scrim (ScrimImage recipe). */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: theme.colors['media-tint'],
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', theme.colors['scrim']]}
        locations={[0.4, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Title block slot — bottom-left, clear of the rail. pointerEvents
          "none" (not "box-none"): the slot is decorative, and on iOS its
          subviews would otherwise capture horizontal swipes over the pager
          (adversarial-review finding). */}
      {overlay ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: theme.spacing(4),
            right: theme.spacing(4) + (images.length > 1 ? 64 : 0),
            bottom: theme.spacing(4),
          }}
        >
          {overlay}
        </View>
      ) : null}

      {/* Vertical thumbnail rail (replaces the dot indicators). */}
      {images.length > 1 ? (
        <View
          style={{
            position: 'absolute',
            right: theme.spacing(3),
            bottom: theme.spacing(4),
            gap: theme.spacing(2),
          }}
        >
          {railImages.map((uri, i) => {
            // Clamp: a refetch can shrink `images` while `index` still points
            // past the end (adversarial-review finding).
            const safeIndex = Math.min(index, images.length - 1);
            const active =
              i === safeIndex ||
              (i === RAIL_THUMBS - 1 && safeIndex >= RAIL_THUMBS);
            return (
              <Pressable
                key={`${i}-${uri}`}
                accessibilityRole="button"
                accessibilityLabel={`${title} ${i + 1}`}
                testID={`gallery-thumb-${i}`}
                onPress={() => {
                  listRef.current?.scrollToIndex({ index: i, animated: true });
                  setIndex(i);
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: theme.radius.md,
                  borderCurve: 'continuous',
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: active
                    ? theme.colors['primary']
                    : theme.colors['border'],
                }}
              >
                <Image
                  source={{ uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                {i === RAIL_THUMBS - 1 && overflow > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors['overlay'],
                    }}
                  >
                    <View>
                      {/* +N overflow count on the last thumb */}
                      <Text
                        style={{
                          color: theme.colors['on-media'],
                          fontFamily: theme.fontFamilies.sansSemiBold,
                          fontSize: 13,
                        }}
                      >
                        +{overflow}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
