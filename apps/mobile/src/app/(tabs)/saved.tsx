import { Alert, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { messages } from '@tourism/i18n';
import { ScreenToolbar, SpotlightEmptyState, color, useTheme } from '@tourism/mobile-ui';

import { TabScreen } from '../../components/tab-screen';

export default function SavedScreen() {
  const theme = useTheme();
  const t = messages.mobile.saved;
  const muted = color(theme, 'muted-foreground');
  const styles = createStyles(theme);

  const openSearchPreview = () => {
    Alert.alert(t.searchLabel, t.searchComingSoon);
  };

  return (
    <TabScreen largeTitle={false} scroll={false} contentStyle={styles.screen}>
      <ScreenToolbar
        title={t.title}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.searchLabel}
            hitSlop={10}
            onPress={openSearchPreview}
            style={({ pressed }) => [
              styles.headerAction,
              pressed && styles.headerActionPressed,
            ]}
          >
            <Ionicons name="search-outline" size={22} color={muted} />
          </Pressable>
        }
      />
      <SpotlightEmptyState title={t.emptyTitle} message={t.emptyHint} centered />
    </TabScreen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    headerAction: {
      width: theme.minTouch,
      height: theme.minTouch,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerActionPressed: {
      opacity: 0.55,
    },
  });
}
