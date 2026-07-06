import { View } from 'react-native';
import { messages } from '@tourism/i18n';
import { AppText, Screen, useTheme } from '@tourism/mobile-ui';

export default function ExploreScreen() {
  const theme = useTheme();
  return (
    <Screen scroll={false}>
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(2) }}
      >
        <AppText variant="title">{messages.mobile.tabs.explore}</AppText>
        <AppText variant="body" muted style={{ textAlign: 'center' }}>
          {messages.mobile.explore.title}
        </AppText>
      </View>
    </Screen>
  );
}
