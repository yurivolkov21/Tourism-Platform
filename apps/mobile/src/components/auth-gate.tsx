import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Button, useTheme } from '@tourism/mobile-ui';

const t = messages.mobile.authPrompts;

/** Centred signed-out gate used by the Saved and Account tabs. */
export function AuthGate({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing(3),
      }}
    >
      <Ionicons
        name={icon}
        size={48}
        color={theme.colors['muted-foreground']}
      />
      <AppText variant="title">{title}</AppText>
      <AppText variant="body" muted style={{ textAlign: 'center' }}>
        {body}
      </AppText>
      <Button label={t.signIn} onPress={() => router.push('/auth/sign-in')} />
      <Button
        label={t.createAccount}
        variant="outline"
        onPress={() => router.push('/auth/sign-up')}
      />
    </View>
  );
}
