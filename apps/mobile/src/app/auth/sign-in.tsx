import { useRef, useState } from 'react';
import { Pressable, View, type TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  Screen,
  TextField,
  useTheme,
} from '@tourism/mobile-ui';
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
    <Screen scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View
        style={{ gap: theme.spacing(4), paddingVertical: theme.spacing(4) }}
      >
        <View style={{ gap: theme.spacing(1) }}>
          <AppText variant="title">{t.title}</AppText>
          <AppText variant="body" muted>
            {reason === 'wishlist'
              ? tp.wishlistReason
              : reason === 'booking'
                ? tp.bookingReason
                : t.subtitle}
          </AppText>
        </View>
        <TextField
          label={t.emailLabel}
          value={email}
          onChangeText={setEmail}
          error={errors.email ? te[errors.email] : undefined}
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
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth/forgot')}
            hitSlop={8}
          >
            <AppText
              variant="caption"
              style={{ color: theme.colors['primary'] }}
            >
              {t.forgotCta}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth/sign-up')}
            hitSlop={8}
          >
            <AppText
              variant="caption"
              style={{ color: theme.colors['primary'] }}
            >
              {t.noAccount} {t.registerCta}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
