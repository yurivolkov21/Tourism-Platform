import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FormError } from '../../src/components/ui/FormError';
import { KeyboardAvoid } from '../../src/components/ui/KeyboardAvoid';
import { LogoMark } from '../../src/components/ui/LogoMark';
import { toAuthError } from '../../src/lib/auth/auth-helpers';
import { supabase } from '../../src/lib/supabase/client';
import { strings } from '../../src/lib/strings';
import { theme } from '../../src/lib/theme';

const t = strings.auth.verify;
const RESEND_COOLDOWN = 60;

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleResend() {
    if (cooldown > 0) return;
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: 'nexora://callback' },
      });
      if (resendError) throw resendError;
      setCooldown(RESEND_COOLDOWN);
      setResent(true);
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

      {/* Email icon */}
      <View style={styles.iconCard}>
        <Text style={styles.iconEmoji}>📧</Text>
        <Text style={styles.iconHint}>
          Tap the confirmation link in the email to verify your account.
          The link will open this app automatically.
        </Text>
      </View>

      {resent && (
        <View style={styles.resentBadge}>
          <Text style={styles.resentText}>New email sent!</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleResend}
        disabled={cooldown > 0}
        style={styles.resendBtn}
      >
        <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
          {cooldown > 0 ? t.resendCooldown(cooldown) : t.resend}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace('/(auth)/login')}
        style={styles.backBtn}
      >
        <Text style={styles.backText}>Back to sign in</Text>
      </TouchableOpacity>
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
  iconCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  iconEmoji: {
    fontSize: 48,
  },
  iconHint: {
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  resentBadge: {
    backgroundColor: theme.colors.successBg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  resentText: {
    fontSize: theme.font.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  resendBtn: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  resendText: {
    fontSize: theme.font.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  resendDisabled: {
    color: theme.colors.textMuted,
  },
  backBtn: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
  },
  backText: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
  },
});
