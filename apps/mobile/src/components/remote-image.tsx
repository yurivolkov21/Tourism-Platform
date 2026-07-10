import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { TOUR_CARD_IMAGE_FALLBACK } from '@tourism/core';
import { color, useTheme } from '@tourism/mobile-ui';

type RemoteImageProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

export function RemoteImage({
  uri,
  style,
  imageStyle,
  accessibilityLabel,
}: RemoteImageProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const resolvedUri = uri.trim() || TOUR_CARD_IMAGE_FALLBACK;
  const [imageUri, setImageUri] = useState(resolvedUri);

  useEffect(() => {
    setFailed(false);
    setImageUri(uri.trim() || TOUR_CARD_IMAGE_FALLBACK);
  }, [uri]);

  const placeholderStyle = [
    style,
    {
      backgroundColor: color(theme, 'muted'),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  ];

  if (failed) {
    return (
      <View style={placeholderStyle} accessibilityLabel={accessibilityLabel}>
        <Ionicons name="image-outline" size={28} color={color(theme, 'muted-foreground')} />
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={{ uri: imageUri }}
        style={[StyleSheet.absoluteFillObject, imageStyle ?? { width: '100%', height: '100%' }]}
        accessibilityLabel={accessibilityLabel}
        onError={() => {
          if (imageUri !== TOUR_CARD_IMAGE_FALLBACK) {
            setImageUri(TOUR_CARD_IMAGE_FALLBACK);
            return;
          }
          setFailed(true);
        }}
      />
    </View>
  );
}
