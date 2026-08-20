import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import Constants from 'expo-constants';
import { messages } from '@tourism/i18n';
import {
  AppText,
  ConfirmSheet,
  Screen,
  useTheme,
  type ConfirmSheetRef,
} from '@tourism/mobile-ui';
import {
  FeedbackLine,
  RowDivider,
  Section,
  SettingsRow,
} from '../components/settings-ui';
import { useAppearance } from '../lib/appearance-context';
import type { AppearancePref } from '../lib/appearance';
import { useAuth } from '../lib/auth-context';
import { hapticWarning } from '../lib/haptics';

const t = messages.mobile.appSettings;

const APPEARANCE_OPTIONS: readonly { value: AppearancePref; label: string }[] =
  [
    { value: 'system', label: t.appearanceSystem },
    { value: 'light', label: t.appearanceLight },
    { value: 'dark', label: t.appearanceDark },
  ];

const APPEARANCE_ICONS: Record<
  AppearancePref,
  'phone-portrait-outline' | 'sunny-outline' | 'moon-outline'
> = {
  system: 'phone-portrait-outline',
  light: 'sunny-outline',
  dark: 'moon-outline',
};

/**
 * Device-level settings, separate from "Account settings" (which is the user's
 * own record: photo, name, email, password, deletion): how the app looks on
 * THIS device, and sessions across all of them.
 */
export default function AppSettingsScreen() {
  const theme = useTheme();
  const { status, signOutEverywhere } = useAuth();
  const { pref, setPref } = useAppearance();
  const sheetRef = useRef<ConfirmSheetRef>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (status !== 'signedIn') return <Redirect href="/" />;

  const confirmSignOutAll = () => {
    if (busy) return;
    hapticWarning();
    sheetRef.current?.present();
  };

  const onSignOutAll = async () => {
    setFailed(false);
    setBusy(true);
    const result = await signOutEverywhere();
    setBusy(false);
    // On success the auth state flips to signed-out and the Redirect above
    // takes the user home — no manual navigation needed.
    if (result.error) setFailed(true);
  };

  const version = Constants.expoConfig?.version ?? '—';

  return (
    // paddingTop: 0 — the native header already clears the status bar.
    <Screen style={{ paddingTop: 0 }}>
      <Stack.Screen options={{ headerShown: true, title: t.title }} />
      <View
        style={{ gap: theme.spacing(7), paddingVertical: theme.spacing(5) }}
      >
        <Section title={t.appearanceHeading} variant="rows">
          {APPEARANCE_OPTIONS.map(({ value, label }, i) => (
            <View key={value}>
              {i > 0 ? <RowDivider inset /> : null}
              <SettingsRow
                label={label}
                icon={APPEARANCE_ICONS[value]}
                selected={pref === value}
                onPress={() => setPref(value)}
              />
            </View>
          ))}
        </Section>

        <View style={{ gap: theme.spacing(2) }}>
          <Section title={t.securityHeading} tone="danger" variant="rows">
            <SettingsRow
              label={t.signOutAll}
              description={t.signOutAllDesc}
              icon="log-out-outline"
              tone="danger"
              onPress={confirmSignOutAll}
            />
          </Section>
          {failed ? (
            <View style={{ paddingHorizontal: theme.spacing(2) }}>
              <FeedbackLine tone="error" text={t.signOutAllError} />
            </View>
          ) : null}
        </View>

        <AppText variant="caption" muted style={{ textAlign: 'center' }}>
          {t.version(version)}
        </AppText>
      </View>

      <ConfirmSheet
        ref={sheetRef}
        title={t.signOutAllConfirmTitle}
        body={t.signOutAllConfirmBody}
        confirmLabel={t.signOutAllConfirmCta}
        cancelLabel={t.signOutAllCancel}
        onConfirm={() => void onSignOutAll()}
      />
    </Screen>
  );
}
