import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthButton } from '../../src/components/ui/AuthButton';
import { FormError } from '../../src/components/ui/FormError';
import { KeyboardAvoid } from '../../src/components/ui/KeyboardAvoid';
import { LogoMark } from '../../src/components/ui/LogoMark';
import { OtpInput } from '../../src/components/ui/OtpInput';
import { toAuthError } from '../../src/lib/auth/auth-helpers';
import { syncUser } from '../../src/lib/api/sync-user';
import { supabase } from '../../src/lib/supabase/client';
import { strings } from '../../src/lib/strings';
import { theme } from '../../src/lib/theme';

const t = strings.auth.verify;
const RESEND_COOLDOWN = 60;

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleVerify(otp: string) {
    if (otp.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      });
      if (verifyError) throw verifyError;
      if (data.session) {
        await syncUser(data.session.access_token);
      }
      router.replace('/(tabs)');
    } catch (err) {
      setError(toAuthError(err));
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    try {
      await supabase.auth.resend({ type: 'signup', email });
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(toAuthError(err));
    }
  }

  return (
    <KeyboardAvoid>
      <View style={styles.header}>
        <LogoMark size="lg" />
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle(email ?? '')}</Text>
      </View>

      <FormError message={error} />

      <OtpInput onComplete={handleVerify} disabled={loading} />

      <AuthButton
        label={t.submit}
        onPress={() => handleVerify(code)}
        loading={loading}
        disabled={code.length !== 6}
        style={styles.button}
      />

      <TouchableOpacity
        onPress={handleResend}
        disabled={cooldown > 0}
        style={styles.resendBtn}
      >
        <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
          {cooldown > 0 ? t.resendCooldown(cooldown) : t.resend}
        </Text>
      </TouchableOpacity>
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
  button: {
    marginTop: theme.spacing.sm,
  },
  resendBtn: {
    alignSelf: 'center',
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  resendText: {
    fontSize: theme.font.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  resendDisabled: {
    color: theme.colors.textMuted,
  },
});
