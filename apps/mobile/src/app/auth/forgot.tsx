import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, TextField, useTheme } from '@tourism/mobile-ui';
import { validateForgot } from '../../lib/auth';
import { useAuth } from '../../lib/auth-context';

const t = messages.auth.forgot;
const tp = messages.mobile.authPrompts;
const te = messages.mobile.authErrors;

export default function ForgotScreen() {
  const theme = useTheme();
  const { sendReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    const validation = validateForgot({ email });
    setError(validation.email ? te[validation.email] : null);
    setBanner(null);
    if (validation.email) return;
    setSubmitting(true);
    const result = await sendReset(email.trim());
    setSubmitting(false);
    if (result.error) {
      setBanner(te[result.error]);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
        >
          <Ionicons name="mail-unread-outline" size={48} color={theme.colors['primary']} />
          <AppText variant="title">{t.sentTitle}</AppText>
          <AppText variant="body" muted style={{ textAlign: 'center' }}>
            {t.sentBody}
          </AppText>
          <AppText variant="caption" muted style={{ textAlign: 'center' }}>
            {tp.resetSentHint}
          </AppText>
          <Button label={t.backToLogin} onPress={() => router.replace('/auth/sign-in')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={{ gap: theme.spacing(4), paddingVertical: theme.spacing(4) }}>
        <View style={{ gap: theme.spacing(1) }}>
          <AppText variant="title">{t.title}</AppText>
          <AppText variant="body" muted>
            {t.subtitle}
          </AppText>
        </View>
        <TextField
          label={t.emailLabel}
          value={email}
          onChangeText={setEmail}
          error={error ?? undefined}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="done"
          onSubmitEditing={() => void onSubmit()}
        />
        {banner ? (
          <AppText variant="body" style={{ color: theme.colors['destructive'] }}>
            {banner}
          </AppText>
        ) : null}
        <Button
          label={submitting ? t.submitting : t.submit}
          onPress={onSubmit}
          loading={submitting}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/auth/sign-in')}
          hitSlop={8}
          style={{ alignSelf: 'center' }}
        >
          <AppText variant="caption" style={{ color: theme.colors['primary'] }}>
            {t.backToLogin}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
