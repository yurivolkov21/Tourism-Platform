import { useRef, useState } from 'react';
import { Pressable, View, type TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  Screen,
  TextField,
  useTheme,
} from '@tourism/mobile-ui';
import { AuthHero } from '../../components/auth-hero';
import { validateSignUp, type SignUpErrors } from '../../lib/auth';
import { useAuth } from '../../lib/auth-context';

const t = messages.auth.register;
const te = messages.mobile.authErrors;

export default function SignUpScreen() {
  const theme = useTheme();
  const { signUp } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const onSubmit = async () => {
    const validation = validateSignUp({ fullName, email, password, confirm });
    setErrors(validation);
    setBanner(null);
    if (Object.keys(validation).length > 0) return;
    setSubmitting(true);
    const result = await signUp(fullName.trim(), email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setBanner(te[result.error]);
    } else if (result.confirmationSent) {
      setConfirmationSent(true);
    } else {
      router.back();
    }
  };

  if (confirmationSent) {
    return (
      <Screen scroll={false}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(3),
          }}
        >
          <Ionicons
            name="mail-unread-outline"
            size={48}
            color={theme.colors['primary']}
          />
          <AppText variant="display">{t.checkInboxTitle}</AppText>
          <AppText variant="body" muted style={{ textAlign: 'center' }}>
            {t.checkInboxBody}
          </AppText>
          <Button
            label={messages.auth.forgot.backToLogin}
            onPress={() => router.replace('/auth/sign-in')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      style={{ paddingHorizontal: 0, paddingTop: 0 }}
      scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
    >
      <AuthHero
        image={require('../../../assets/onboarding/onboarding-1.jpg')}
        title={t.title}
      />
      <View
        style={{
          gap: theme.spacing(4),
          paddingHorizontal: theme.spacing(4),
          paddingVertical: theme.spacing(4),
        }}
      >
        <AppText variant="body" muted>
          {t.subtitle}
        </AppText>
        <TextField
          label={t.fullNameLabel}
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName ? te[errors.fullName] : undefined}
          leading={
            <Ionicons
              name="person-outline"
              size={16}
              color={theme.colors['primary']}
            />
          }
          autoCorrect={false}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label={t.emailLabel}
          value={email}
          onChangeText={setEmail}
          error={errors.email ? te[errors.email] : undefined}
          leading={
            <Ionicons
              name="mail-outline"
              size={16}
              color={theme.colors['primary']}
            />
          }
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label={t.passwordLabel}
          value={password}
          onChangeText={setPassword}
          error={errors.password ? te[errors.password] : undefined}
          leading={
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={theme.colors['primary']}
            />
          }
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <TextField
          ref={confirmRef}
          label={t.confirmLabel}
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm ? te[errors.confirm] : undefined}
          leading={
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={theme.colors['primary']}
            />
          }
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => void onSubmit()}
        />
        {banner ? (
          <AppText
            variant="body"
            style={{ color: theme.colors['destructive'] }}
          >
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
          <AppText variant="caption" muted>
            {t.haveAccount}{' '}
            <AppText
              variant="caption"
              style={{
                color: theme.colors['primary'],
                fontFamily: theme.fontFamilies.sansSemiBold,
              }}
            >
              {t.loginCta}
            </AppText>
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
