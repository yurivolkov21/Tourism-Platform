import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  View,
  type TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  Screen,
  Spinner,
  TextField,
  useTheme,
} from '@tourism/mobile-ui';
import { AuthHero } from '../../components/auth-hero';
import { PasswordStrength } from '../../components/password-strength';
import { mergeFieldError, type AuthErrorKey } from '../../lib/auth';
import { useAuth } from '../../lib/auth-context';
import {
  validateChangePassword,
  type ChangePasswordErrors,
} from '../../lib/change-password';
import { useIncomingLink } from '../../lib/deep-link';
import { describeRecoveryLink, parseRecoveryLink } from '../../lib/reset-link';
import { supabase } from '../../lib/supabase';

const t = messages.auth.reset;
const tf = messages.auth.forgot;
const te = messages.mobile.authErrors;
const ts = messages.auth.account.securityPage.password;

type Phase = 'opening' | 'ready' | 'invalid' | 'done';

/** How long to wait for a deep link before calling it a dead end. */
const LINK_TIMEOUT_MS = 8000;

/**
 * Finishes a password recovery **inside the app**. Supabase mails a link that
 * deep-links here, in one of three shapes depending on the project's email
 * template and flow type — `reset-link.ts` reads all three, and this screen
 * adopts the session accordingly. The raw URL comes from `useIncomingLink()`
 * rather than route params, because `useLocalSearchParams` cannot see a URL
 * fragment (same trap `google-auth.ts` documents).
 *
 * Before this screen existed the reset link went to the Site URL, i.e. the web
 * app, so a phone user had to leave the app, set the password in a browser, and
 * come back to sign in.
 */
export default function ResetPasswordScreen() {
  const theme = useTheme();
  const { changePassword } = useAuth();
  // NOT `Linking.useURL()` — on a warm start the OS delivers the link and
  // expo-router navigates before this screen mounts, so a hook that only starts
  // listening here misses it entirely and waits forever. See `deep-link.ts`.
  const url = useIncomingLink();
  const confirmRef = useRef<TextInput>(null);

  const [phase, setPhase] = useState<Phase>('opening');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<ChangePasswordErrors>({});
  const [banner, setBanner] = useState<AuthErrorKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const link = parseRecoveryLink(url);
    if (!link) {
      // Nothing usable yet. `useURL` starts as null, so a moment of this is
      // normal — but never spin forever: a link whose shape we cannot read is
      // a dead end the user has to be told about, not left staring at.
      const timer = setTimeout(() => setPhase('invalid'), LINK_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
    if (link.kind === 'error') {
      setPhase('invalid');
      return;
    }

    let cancelled = false;
    // Whichever shape arrived, the goal is the same: hold a session for this
    // account. THAT is the proof of ownership which authorises the updateUser
    // below — the email link having been opened is the second factor.
    const adopt = async () => {
      if (link.kind === 'tokens') {
        return supabase.auth.setSession({
          access_token: link.accessToken,
          refresh_token: link.refreshToken,
        });
      }
      if (link.kind === 'tokenHash') {
        return supabase.auth.verifyOtp({
          type: link.type as 'recovery',
          token_hash: link.tokenHash,
        });
      }
      return supabase.auth.exchangeCodeForSession(link.code);
    };

    adopt().then(({ error }) => {
      if (cancelled) return;
      setPhase(error ? 'invalid' : 'ready');
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const passwordInput = { password, confirm, requireCurrent: false };

  const blurField = (field: keyof ChangePasswordErrors) =>
    setErrors((prev) =>
      mergeFieldError(prev, validateChangePassword(passwordInput), field),
    );

  const onSubmit = async () => {
    const validation = validateChangePassword(passwordInput);
    setErrors(validation);
    setBanner(null);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    // No current password: proving the email was the re-auth. `changePassword`
    // still revokes the other sessions, which is the whole point of a reset
    // after a suspected compromise.
    const result = await changePassword(password);
    setSubmitting(false);
    if (result.error) {
      setBanner(result.error);
      return;
    }
    setPhase('done');
  };

  if (phase === 'opening') {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Spinner />
        </View>
      </Screen>
    );
  }

  if (phase === 'invalid' || phase === 'done') {
    const isDone = phase === 'done';
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
            name={isDone ? 'checkmark-circle-outline' : 'alert-circle-outline'}
            size={48}
            color={
              isDone ? theme.colors['success'] : theme.colors['destructive']
            }
          />
          <AppText variant="display" style={{ textAlign: 'center' }}>
            {isDone ? t.success : t.invalidTitle}
          </AppText>
          <AppText variant="body" muted style={{ textAlign: 'center' }}>
            {isDone ? ts.successHint : t.invalidBody}
          </AppText>
          {!isDone && __DEV__ ? (
            // Parameter NAMES only — the values are credentials. Dev builds
            // only, so a mis-shaped link can be diagnosed from the device.
            <AppText variant="caption" muted style={{ textAlign: 'center' }}>
              {describeRecoveryLink(url)}
            </AppText>
          ) : null}
          <Button
            label={isDone ? t.goToAccount : t.requestNew}
            onPress={() => router.replace(isDone ? '/account' : '/auth/forgot')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen
        style={{ paddingTop: 0 }}
        scrollProps={{
          keyboardShouldPersistTaps: 'handled',
          contentContainerStyle: {
            flexGrow: 1,
            paddingBottom: theme.spacing(8),
          },
        }}
      >
        <AuthHero
          image={require('../../../assets/onboarding/onboarding-3.jpg')}
          title={t.title}
        />
        <View
          style={{
            flex: 1,
            gap: theme.spacing(6),
            paddingHorizontal: theme.spacing(7),
            paddingTop: theme.spacing(6),
          }}
        >
          <AppText variant="body" muted>
            {t.subtitle}
          </AppText>
          <TextField
            variant="underline"
            placeholder={t.passwordLabel}
            value={password}
            onChangeText={setPassword}
            onBlur={() => blurField('password')}
            error={errors.password ? te[errors.password] : undefined}
            leading={
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={theme.colors['primary']}
              />
            }
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? ts.hide : ts.show}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={theme.colors['muted-foreground']}
                />
              </Pressable>
            }
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <PasswordStrength password={password} />
          <TextField
            ref={confirmRef}
            variant="underline"
            placeholder={t.confirmLabel}
            value={confirm}
            onChangeText={setConfirm}
            onBlur={() => blurField('confirm')}
            error={errors.confirm ? te[errors.confirm] : undefined}
            leading={
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={theme.colors['primary']}
              />
            }
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showConfirm ? ts.hide : ts.show}
                onPress={() => setShowConfirm((v) => !v)}
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={theme.colors['muted-foreground']}
                />
              </Pressable>
            }
            secureTextEntry={!showConfirm}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={() => void onSubmit()}
          />
          {banner ? (
            <AppText
              variant="body"
              accessibilityRole="alert"
              style={{ color: theme.colors['destructive'] }}
            >
              {te[banner]}
            </AppText>
          ) : null}
          <Button
            label={submitting ? t.submitting : t.submit}
            onPress={() => void onSubmit()}
            loading={submitting}
          />
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth/sign-in')}
            hitSlop={8}
            style={{ alignSelf: 'center' }}
          >
            <AppText
              variant="caption"
              style={{ color: theme.colors['primary'] }}
            >
              {tf.backToLogin}
            </AppText>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
