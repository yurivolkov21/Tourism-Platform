import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthButton } from '../../src/components/ui/AuthButton';
import { AuthInput } from '../../src/components/ui/AuthInput';
import { FormError } from '../../src/components/ui/FormError';
import { KeyboardAvoid } from '../../src/components/ui/KeyboardAvoid';
import { LogoMark } from '../../src/components/ui/LogoMark';
import {
  toAuthError,
  validateEmail,
  validatePassword,
} from '../../src/lib/auth/auth-helpers';
import { strings } from '../../src/lib/strings';
import { theme } from '../../src/lib/theme';
import { useAuth } from '../../src/providers/auth-provider';

const t = strings.auth.register;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError(t.emailInvalid);
      return;
    }
    if (!validatePassword(password)) {
      setError(t.passwordWeak);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim());
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
        label={t.fullNameLabel}
        placeholder={t.fullNamePlaceholder}
        value={fullName}
        onChangeText={setFullName}
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <AuthInput
        ref={emailRef}
        label={t.emailLabel}
        placeholder={t.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <AuthInput
        ref={passwordRef}
        label={t.passwordLabel}
        placeholder={t.passwordPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <AuthInput
        ref={confirmRef}
        label={t.confirmPasswordLabel}
        placeholder={t.confirmPasswordPlaceholder}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleRegister}
      />

      <AuthButton
        label={t.submit}
        onPress={handleRegister}
        loading={loading}
        style={styles.button}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t.hasAccount} </Text>
        <Link href="/(auth)/login">
          <Text style={styles.footerLink}>{t.login}</Text>
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
