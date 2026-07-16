import { useRef, useState } from 'react';
import { Pressable, View, type TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { validateSignIn, type SignInErrors } from '../../lib/auth';
import { useAuth } from '../../lib/auth-context';

const t = messages.auth.login;
const tp = messages.mobile.authPrompts;
const te = messages.mobile.authErrors;

export default function SignInScreen() {
  const theme = useTheme();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { signIn } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<SignInErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <Screen
      style={{ paddingHorizontal: 0, paddingTop: 0 }}
      scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
    >
      {/* P5.7 S2: photo header dissolving into the background (Navel). */}
      <AuthHero
        image={require('../../../assets/onboarding/onboarding-2.jpg')}
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
          {reason === 'wishlist'
            ? tp.wishlistReason
            : reason === 'booking'
              ? tp.bookingReason
              : t.subtitle}
        </AppText>
        <TextField
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
        <View>
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
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => void onSubmit()}
          />
          {/* "Forgot?" inline with the field label (Navel Screen-4). */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth/forgot')}
            hitSlop={8}
            style={{ position: 'absolute', right: 0, top: 0 }}
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
  );
}
