import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '../../src/components/ui/AuthButton';
import { AuthInput } from '../../src/components/ui/AuthInput';
import { FormError } from '../../src/components/ui/FormError';
import { KeyboardAvoid } from '../../src/components/ui/KeyboardAvoid';
import { LogoMark } from '../../src/components/ui/LogoMark';
import { toAuthError, validateEmail } from '../../src/lib/auth/auth-helpers';
import { supabase } from '../../src/lib/supabase/client';
import { strings } from '../../src/lib/strings';
import { theme } from '../../src/lib/theme';

const t = strings.auth.forgotPassword;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setError(null);
    if (!validateEmail(email.trim())) {
      setError(strings.auth.register.emailInvalid);
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: 'nexora://reset-password' },
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(toAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <KeyboardAvoid>
        <View style={styles.header}>
          <LogoMark size="lg" />
          <Text style={styles.title}>{t.successTitle}</Text>
          <Text style={styles.subtitle}>{t.successSubtitle(email)}</Text>
        </View>
        <View style={styles.successCard}>
          <Text style={styles.successText}>
            Click the link in your email to set a new password. You can close
            this screen.
          </Text>
        </View>
        <Link href="/(auth)/login" style={styles.backLink}>
          <Text style={styles.backText}>{t.backToLogin}</Text>
        </Link>
      </KeyboardAvoid>
    );
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
        label={t.emailLabel}
        placeholder={t.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="done"
        onSubmitEditing={handleSend}
      />

      <AuthButton
        label={t.submit}
        onPress={handleSend}
        loading={loading}
        style={styles.button}
      />

      <Link href="/(auth)/login" style={styles.backLink}>
        <Text style={styles.backText}>{t.backToLogin}</Text>
      </Link>
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
  backLink: {
    alignSelf: 'center',
    marginTop: theme.spacing.lg,
  },
  backText: {
    fontSize: theme.font.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  successCard: {
    backgroundColor: theme.colors.successBg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  successText: {
    color: theme.colors.primary,
    fontSize: theme.font.sm,
    lineHeight: 20,
  },
});
