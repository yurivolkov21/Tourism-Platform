import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { AppText, Button, Screen, TextField } from '@tourism/mobile-ui';
import { messages } from '@tourism/i18n';

import { useAuth } from '../../lib/auth/auth-provider';

export default function LoginScreen() {
  const t = messages.mobile.auth;
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError(t.genericValidationError);
      return;
    }
    setError(undefined);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/trips');
    }
  };

  return (
    <Screen title={t.loginTitle} subtitle={t.loginSubtitle} keyboardAware>
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
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
          autoComplete="password"
          textContentType="password"
          error={error}
        />
        <Button label={t.loginCta} onPress={onSubmit} loading={loading} />
        <Pressable
          onPress={() => router.replace('/(auth)/register')}
          accessibilityRole="button"
          style={{ alignItems: 'center', paddingVertical: 8 }}
        >
          <AppText variant="body" muted>
            {t.noAccount} <AppText variant="body">{t.signUpLink}</AppText>
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
