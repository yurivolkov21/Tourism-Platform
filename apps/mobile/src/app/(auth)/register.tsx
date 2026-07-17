import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { AppText, Button, EmptyState, Screen, TextField } from '@tourism/mobile-ui';
import { messages } from '@tourism/i18n';

import { useAuth } from '../../lib/auth/auth-provider';

const MIN_PASSWORD = 6;

export default function RegisterScreen() {
  const t = messages.mobile.auth;
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    if (fullName.trim().length < 2) {
      setError(t.nameTooShort);
      return;
    }
    if (!email.trim() || !password) {
      setError(t.genericValidationError);
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.passwordMismatch);
      return;
    }

    setError(undefined);
    setLoading(true);
    const result = await signUp({ email: email.trim(), password, fullName: fullName.trim() });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <Screen title={t.checkInboxTitle}>
        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          <EmptyState message={t.checkInboxBody} />
          <Button label={t.backToLogin} onPress={() => router.replace('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t.registerTitle} subtitle={t.registerSubtitle} keyboardAware>
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        <TextField
          label={t.fullNameLabel}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
        <TextField
          label={t.emailLabel}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label={t.passwordLabel}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
        />
        <TextField
          label={t.confirmPasswordLabel}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          error={error}
        />
        <Button label={t.registerCta} onPress={onSubmit} loading={loading} />
        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          accessibilityRole="button"
          style={{ alignItems: 'center', paddingVertical: 8 }}
        >
          <AppText variant="body" muted>
            {t.hasAccount} <AppText variant="body">{t.logInLink}</AppText>
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
