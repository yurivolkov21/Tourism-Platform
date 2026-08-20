import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { messages } from '@tourism/i18n';
import { Screen, useTheme } from '@tourism/mobile-ui';
import { RowDivider, Section, SettingsRow } from '../../components/settings-ui';

const t = messages.mobile.legalIndex;
const ta = messages.mobile.account;

/**
 * One "Legal" destination in place of three separate rows in the account menu
 * (2026-08-20, user request) — the documents themselves are unchanged, still
 * rendered by `legal/[doc]` from the shared LegalDoc modules. Public: reading a
 * policy never requires an account.
 */
export default function LegalIndexScreen() {
  const theme = useTheme();
  return (
    // paddingTop: 0 — the native header already clears the status bar.
    <Screen style={{ paddingTop: 0 }}>
      <Stack.Screen options={{ headerShown: true, title: t.title }} />
      <View
        style={{ gap: theme.spacing(7), paddingVertical: theme.spacing(5) }}
      >
        {/* No group label: the native header already says "Legal". */}
        <Section variant="rows">
          <SettingsRow
            label={ta.menuPrivacy}
            icon="shield-checkmark-outline"
            onPress={() => router.push('/legal/privacy')}
          />
          <RowDivider inset />
          <SettingsRow
            label={ta.menuTerms}
            icon="document-text-outline"
            onPress={() => router.push('/legal/terms')}
          />
          <RowDivider inset />
          <SettingsRow
            label={ta.menuCancellation}
            icon="calendar-clear-outline"
            onPress={() => router.push('/legal/cancellation')}
          />
        </Section>
      </View>
    </Screen>
  );
}
