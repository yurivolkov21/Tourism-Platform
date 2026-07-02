import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '../../src/components/ui/AuthButton';
import { AuthInput } from '../../src/components/ui/AuthInput';
import { FormError } from '../../src/components/ui/FormError';
import { KeyboardAvoid } from '../../src/components/ui/KeyboardAvoid';
import { LogoMark } from '../../src/components/ui/LogoMark';
import { toAuthError } from '../../src/lib/auth/auth-helpers';
import { strings } from '../../src/lib/strings';
import { theme } from '../../src/lib/theme';
import { useAuth } from '../../src/providers/auth-provider';

const t = strings.auth.login;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
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
        label={t.emailLabel}
        placeholder={t.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <AuthInput
        label={t.passwordLabel}
        placeholder={t.passwordPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={handleSignIn}
      />

      <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
        <Text style={styles.forgotText}>{t.forgotPassword}</Text>
      </Link>

      <AuthButton
        label={t.submit}
        onPress={handleSignIn}
        loading={loading}
        style={styles.button}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t.noAccount} </Text>
        <Link href="/(auth)/register">
          <Text style={styles.footerLink}>{t.register}</Text>
        </Link>
      </View>
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
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  forgotText: {
    fontSize: theme.font.sm,
    color: theme.colors.primary,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
  },
  footerLink: {
    fontSize: theme.font.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
