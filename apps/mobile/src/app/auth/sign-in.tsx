import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  View,
  type TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { validateSignIn, type SignInErrors } from '../../lib/auth';
import { useAuth } from '../../lib/auth-context';

const t = messages.auth.login;
const tp = messages.mobile.authPrompts;
const te = messages.mobile.authErrors;

export default function SignInScreen() {
  const theme = useTheme();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { signIn, signInWithGoogle } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<SignInErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const onSubmit = async () => {
    const validation = validateSignIn({ email, password });
    setErrors(validation);
    setBanner(null);
    if (Object.keys(validation).length > 0) return;
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setBanner(te[result.error]);
    } else {
      router.back();
    }
  };

  const onGoogle = async () => {
    setBanner(null);
    setGoogleSubmitting(true);
    const result = await signInWithGoogle();
    setGoogleSubmitting(false);
    if (result.error && result.error !== 'cancelled') {
      setBanner(te[result.error]);
    } else if (!result.error) {
      router.back();
    }
    // cancelled: no banner, no navigation — silently return to the form.
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      // 'undefined' on Android depends on windowSoftInputMode=adjustResize,
      // which edgeToEdgeEnabled makes unreliable — 'height' measures the
      // keyboard directly instead.
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen
        style={{ paddingTop: 0 }}
        scrollProps={{
          keyboardShouldPersistTaps: 'handled',
          // flexGrow lets the footer pin to the screen bottom (Navel rhythm).
          contentContainerStyle: {
            flexGrow: 1,
            paddingBottom: theme.spacing(8),
          },
        }}
      >
        {/* P5.7 S2 v2: tall photo header dissolving into the background. */}
        <AuthHero
          image={require('../../../assets/onboarding/onboarding-2.jpg')}
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
          {reason === 'wishlist' || reason === 'booking' ? (
            <AppText variant="body" muted>
              {reason === 'wishlist' ? tp.wishlistReason : tp.bookingReason}
            </AppText>
          ) : null}
          <TextField
            variant="underline"
            placeholder={t.emailLabel}
            value={email}
            onChangeText={setEmail}
            error={errors.email ? te[errors.email] : undefined}
            leading={
              <Ionicons
                name="mail-outline"
                size={18}
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
          <View style={{ gap: theme.spacing(2) }}>
            <TextField
              ref={passwordRef}
              variant="underline"
              placeholder={t.passwordLabel}
              value={password}
              onChangeText={setPassword}
              error={errors.password ? te[errors.password] : undefined}
              leading={
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.colors['primary']}
                />
              }
              trailing={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? t.hidePassword : t.showPassword
                  }
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={theme.colors['muted-foreground']}
                  />
                </Pressable>
              }
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={() => void onSubmit()}
            />
            {/* Own row below the field — the trailing eye icon now occupies
              the space "Forgot?" used to overlay on top of. */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/auth/forgot')}
              hitSlop={8}
              style={{ alignSelf: 'flex-end' }}
            >
              <AppText
                variant="caption"
                style={{ color: theme.colors['primary'] }}
              >
                {t.forgotCta}
              </AppText>
            </Pressable>
          </View>
          {banner ? (
            <AppText
              variant="body"
              accessibilityRole="alert"
              style={{ color: theme.colors['destructive'] }}
            >
              {banner}
            </AppText>
          ) : null}
          <Button
            label={submitting ? t.submitting : t.submit}
            onPress={onSubmit}
            loading={submitting}
            disabled={googleSubmitting}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing(3),
            }}
          >
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: theme.colors['border'],
              }}
            />
            <AppText variant="caption" muted>
              {t.orDivider}
            </AppText>
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: theme.colors['border'],
              }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.googleCta}
            onPress={() => void onGoogle()}
            disabled={submitting || googleSubmitting}
            android_ripple={{ color: theme.colors['muted'], foreground: true }}
            style={({ pressed }) => ({
              alignSelf: 'center',
              width: 56,
              height: 56,
              borderRadius: theme.radius.lg,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: theme.colors['border'],
              alignItems: 'center',
              justifyContent: 'center',
              opacity: submitting
                ? 0.5
                : process.env.EXPO_OS === 'ios' && pressed
                  ? 0.7
                  : 1,
            })}
          >
            {googleSubmitting ? (
              <Spinner size="small" />
            ) : (
              <Ionicons
                name="logo-google"
                size={22}
                color={theme.colors['foreground']}
              />
            )}
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth/sign-up')}
            hitSlop={8}
            style={{ alignSelf: 'center' }}
          >
            <AppText variant="caption" muted>
              {t.noAccount}{' '}
              <AppText
                variant="caption"
                style={{
                  color: theme.colors['primary'],
                  fontFamily: theme.fontFamilies.sansSemiBold,
                }}
              >
                {t.registerCta}
              </AppText>
            </AppText>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
