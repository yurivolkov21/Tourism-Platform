import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from './theme-provider';

export interface AvatarProps {
  /** Photo URL. Falls back to `children` (e.g. an initial letter) when absent. */
  uri?: string | null;
  size: number;
  /** Defaults to a circle (`size / 2`). */
  radius?: number;
  children?: ReactNode;
  testID?: string;
}

/** Square/circle tile: photo when `uri` is set, else whatever fallback the caller renders. */
export function Avatar({ uri, size, radius, children, testID }: AvatarProps) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size / 2,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors['secondary'],
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image
          testID="avatar-image"
          source={{ uri }}
          alt=""
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        children
      )}
    </View>
  );
}
