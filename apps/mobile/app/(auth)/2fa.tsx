import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FormError } from '../../src/components/ui/FormError';
import { KeyboardAvoid } from '../../src/components/ui/KeyboardAvoid';
import { LogoMark } from '../../src/components/ui/LogoMark';
import { OtpInput } from '../../src/components/ui/OtpInput';
import { toAuthError } from '../../src/lib/auth/auth-helpers';
import { syncUser } from '../../src/lib/api/sync-user';
import { supabase } from '../../src/lib/supabase/client';
import { strings } from '../../src/lib/strings';
import { theme } from '../../src/lib/theme';

const t = strings.auth.twoFa;

export default function TwoFaScreen() {
  const { factorId } = useLocalSearchParams<{ factorId: string }>();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(code: string) {
    if (!factorId) {
      setError('Missing factor. Please sign in again.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        await syncUser(sessionData.session.access_token);
      }
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

      <OtpInput onComplete={handleVerify} disabled={loading} />
    </KeyboardAvoid>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.lg,
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
});
