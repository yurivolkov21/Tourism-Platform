import { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type FullscreenImageViewerProps = {
  visible: boolean;
  urls: string[];
  initialIndex?: number;
  onClose: () => void;
};

/** Minimal fullscreen viewer — Modal + Image, tap to dismiss. */
export function FullscreenImageViewer({
  visible,
  urls,
  initialIndex = 0,
  onClose,
}: FullscreenImageViewerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const styles = createStyles(theme, insets.top, insets.bottom);

  if (urls.length === 0) return null;

  const safeInitial = Math.min(initialIndex, urls.length - 1);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <AppText variant="headline" style={styles.close}>
              ✕
            </AppText>
          </Pressable>
          {urls.length > 1 ? (
            <AppText variant="caption" style={styles.counter}>
              {index + 1} / {urls.length}
            </AppText>
          ) : null}
        </View>
        <FlatList
          data={urls}
          horizontal
          pagingEnabled
          initialScrollIndex={safeInitial}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
          renderItem={({ item }) => (
            <Pressable style={{ width, height: height * 0.65 }} onPress={onClose}>
              <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  topInset: number,
  bottomInset: number,
) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: color(theme, 'foreground'),
      opacity: 1,
      paddingTop: topInset + theme.spacing.sm,
      paddingBottom: bottomInset + theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    close: { color: color(theme, 'background') },
    counter: { color: color(theme, 'muted-foreground') },
    image: { width: '100%', height: '100%' },
  });
}
