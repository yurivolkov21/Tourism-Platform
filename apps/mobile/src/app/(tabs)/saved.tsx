import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Screen, useTheme } from '@tourism/mobile-ui';

export default function SavedScreen() {
  const theme = useTheme();
  return (
    <Screen scroll={false}>
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
      >
        <Ionicons name="heart-outline" size={48} color={theme.colors['muted-foreground']} />
        <AppText variant="title">{messages.mobile.tabs.saved}</AppText>
        <AppText variant="body" muted style={{ textAlign: 'center' }}>
          {messages.mobile.placeholders.saved}
        </AppText>
      </View>
    </Screen>
  );
}
