import { View } from 'react-native';
import { messages } from '@tourism/i18n';
import { AppText, Screen, useTheme } from '@tourism/mobile-ui';

export default function AccountScreen() {
  const theme = useTheme();
  return (
    <Screen scroll={false}>
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(2) }}
      >
        <AppText variant="title">{messages.mobile.tabs.account}</AppText>
        <AppText variant="body" muted style={{ textAlign: 'center' }}>
          {messages.mobile.placeholders.account}
        </AppText>
      </View>
    </Screen>
  );
}
