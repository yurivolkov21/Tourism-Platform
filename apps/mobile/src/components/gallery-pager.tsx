import { useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@tourism/mobile-ui';

/** Edge-to-edge horizontal image pager with dot indicators. */
export function GalleryPager({ images, title }: { images: string[]; title: string }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return <View style={{ width: '100%', height: 280, backgroundColor: theme.colors['muted'] }} />;
  }
  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={images}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width, height: 280, backgroundColor: theme.colors['muted'] }}
            contentFit="cover"
            transition={200}
            accessibilityLabel={title}
          />
        )}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      />
      {images.length > 1 ? (
        <View
          style={{
            position: 'absolute',
            bottom: theme.spacing(2),
            alignSelf: 'center',
            flexDirection: 'row',
            gap: theme.spacing(1),
          }}
        >
          {images.map((_, i) => (
            <View
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? theme.colors['primary'] : theme.colors['background'],
                opacity: i === index ? 1 : 0.7,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
