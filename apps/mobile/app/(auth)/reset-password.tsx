import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthButton } from '../../src/components/ui/AuthButton';
import { AuthInput } from '../../src/components/ui/AuthInput';
import { FormError } from '../../src/components/ui/FormError';
import { KeyboardAvoid } from '../../src/components/ui/KeyboardAvoid';
import { LogoMark } from '../../src/components/ui/LogoMark';
import { toAuthError, validatePassword } from '../../src/lib/auth/auth-helpers';
import { supabase } from '../../src/lib/supabase/client';
import { strings } from '../../src/lib/strings';
import { theme } from '../../src/lib/theme';

const t = strings.auth.resetPassword;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const confirmRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const parsed = Linking.parse(url);
      const accessToken = parsed.queryParams?.['access_token'] as string | undefined;
      const refreshToken = parsed.queryParams?.['refresh_token'] as string | undefined;

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        setSessionReady(true);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
      else setSessionReady(true);
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  async function handleReset() {
    setError(null);

    if (!validatePassword(password)) {
      setError(strings.auth.register.passwordWeak);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      router.replace('/(tabs)');
    } catch (err) {
      setError(toAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoid>
      <View style={styles.header}>
        <LogoMark size="lg" />
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>

      <FormError message={error} />

      <AuthInput
        label={t.passwordLabel}
        placeholder={t.passwordPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        returnKeyType="next"
        editable={sessionReady}
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <AuthInput
        ref={confirmRef}
        label={t.confirmLabel}
        placeholder={t.confirmPlaceholder}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        textContentType="newPassword"
        returnKeyType="done"
        editable={sessionReady}
        onSubmitEditing={handleReset}
      />

      <AuthButton
        label={t.submit}
        onPress={handleReset}
        loading={loading}
        disabled={!sessionReady}
        style={styles.button}
      />
    </KeyboardAvoid>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.font.xxxl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  subtitle: {
    fontSize: theme.font.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
});
