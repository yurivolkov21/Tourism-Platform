import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  ConfirmSheet,
  Screen,
  Skeleton,
  Spinner,
  TextField,
  useTheme,
  type ConfirmSheetRef,
  type TextFieldProps,
} from '@tourism/mobile-ui';
import { removeAvatar, uploadAvatar } from '../lib/avatar';
import { mergeFieldError, type AuthErrorKey } from '../lib/auth';
import { useAuth } from '../lib/auth-context';
import {
  validateChangePassword,
  type ChangePasswordErrors,
} from '../lib/change-password';
import { hapticWarning } from '../lib/haptics';
import {
  fetchProfile,
  toProfileVm,
  updateProfile,
  type ProfileVm,
} from '../lib/profile';
import {
  buildUpdateProfilePayload,
  validateProfile,
  type ProfileErrors,
} from '../lib/profile-form';
import { PasswordStrength } from '../components/password-strength';
import {
  FeedbackLine,
  RowDivider,
  Section,
  SettingsRow,
  useSurface,
} from '../components/settings-ui';

const t = messages.mobile.account;
const te = messages.mobile.authErrors;
const ts = messages.auth.account.securityPage.password;
const tc = messages.auth.account.connected;
const ds = messages.auth.account.settings;
const dz = messages.auth.account.danger;
const ta = messages.auth.account.profile.avatar;

/**
 * Caption label over a hairline field — no box inside the group's box. `label`
 * still goes to TextField for the a11y name; `underline` doesn't render it.
 */
function Field({ label, ...rest }: TextFieldProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1) }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <TextField variant="underline" label={label} {...rest} />
    </View>
  );
}

function SettingsBody({ profile }: { profile: ProfileVm }) {
  const theme = useTheme();
  const surface = useSurface();
  const queryClient = useQueryClient();
  const {
    providers,
    changePassword,
    linkProvider,
    deleteAccount,
    googleAvatarUrl,
  } = useAuth();
  const [name, setName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null);
  const deleteSheetRef = useRef<ConfirmSheetRef>(null);

  // Enables Save only once something actually changed — trimmed, matching what
  // `buildUpdateProfilePayload` sends, so a trailing space alone doesn't count.
  // Validity is deliberately NOT part of this: a dirty-but-invalid form stays
  // pressable so the press can SAY what's wrong instead of going quietly grey.
  const canSave =
    name.trim() !== profile.fullName || phone.trim() !== profile.phone;

  /** On blur: judge this field only, leaving the other's error as it stands. */
  const blurProfileField = (field: 'fullName' | 'phone') =>
    setProfileErrors((prev) =>
      mergeFieldError(prev, validateProfile({ fullName: name, phone }), field),
    );

  const saveM = useMutation({
    mutationFn: updateProfile,
    onSuccess: (vm) => {
      queryClient.setQueryData(['profile'], vm);
      setFeedback('saved');
    },
    onError: () => setFeedback('error'),
  });

  const onSaveProfile = () => {
    const errors = validateProfile({ fullName: name, phone });
    setProfileErrors(errors);
    setFeedback(null);
    if (Object.keys(errors).length > 0) return;
    saveM.mutate(buildUpdateProfilePayload({ fullName: name, phone }));
  };

  const [avatarFeedback, setAvatarFeedback] = useState<
    'saved' | 'error' | null
  >(null);

  const avatarM = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (dto) => {
      queryClient.setQueryData(['profile'], toProfileVm(dto));
      setAvatarFeedback('saved');
    },
    onError: () => setAvatarFeedback('error'),
  });

  const removeAvatarM = useMutation({
    mutationFn: removeAvatar,
    onSuccess: (dto) => {
      queryClient.setQueryData(['profile'], toProfileVm(dto));
      setAvatarFeedback('saved');
    },
    onError: () => setAvatarFeedback('error'),
  });

  const avatarBusy = avatarM.isPending || removeAvatarM.isPending;

  const onPickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarFeedback('error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setAvatarFeedback(null);
    avatarM.mutate({
      uri: asset.uri,
      name: asset.fileName ?? 'avatar.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    });
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<ChangePasswordErrors>(
    {},
  );
  const [passwordDone, setPasswordDone] = useState(false);
  // The mapped Supabase key, not a bare flag — a failed change has to SAY why
  // (it used to be swallowed: the error branch set state nothing rendered).
  const [passwordError, setPasswordError] = useState<AuthErrorKey | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Straight from the API. NOT `providers.includes('email')`: Supabase fills
  // `encrypted_password` without creating an `email` identity when a password
  // is added to an OAuth-only account, so the provider list says `['google']`
  // forever even though email sign-in works — the account screen would keep
  // offering to set up a password the user already has.
  const hasPassword = profile.hasPassword;

  const passwordInput = {
    password: newPassword,
    confirm: confirmPassword,
    currentPassword,
    requireCurrent: true,
  };

  const blurPasswordField = (field: keyof ChangePasswordErrors) =>
    setPasswordErrors((prev) =>
      mergeFieldError(prev, validateChangePassword(passwordInput), field),
    );

  const onChangePassword = async () => {
    const errors = validateChangePassword(passwordInput);
    setPasswordErrors(errors);
    setPasswordDone(false);
    setPasswordError(null);
    if (Object.keys(errors).length > 0) return;

    setPasswordSubmitting(true);
    const result = await changePassword(newPassword, currentPassword);
    setPasswordSubmitting(false);
    if (result.error) {
      // A rejected re-auth belongs on the current-password field, not on a
      // banner that leaves the user guessing which input to fix.
      if (result.field === 'currentPassword')
        setPasswordErrors({ currentPassword: 'wrongPassword' });
      else setPasswordError(result.error);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordDone(true);
  };

  const connectedLabels: Record<string, string> = {
    google: tc.google,
    email: tc.email,
  };
  const connectedIcons: Record<string, 'logo-google' | 'mail-outline'> = {
    google: 'logo-google',
    email: 'mail-outline',
  };
  const connectedItems = providers.filter((p) => p in connectedLabels);

  const [connectState, setConnectState] = useState<
    { kind: 'idle' | 'connecting' } | { kind: 'error'; key: AuthErrorKey }
  >({ kind: 'idle' });

  const connectFeedbackStyle = {
    paddingHorizontal: theme.spacing(5),
    paddingBottom: theme.spacing(4),
  };

  const onConnectGoogle = async () => {
    setConnectState({ kind: 'connecting' });
    const result = await linkProvider('google');
    setConnectState(
      result.error ? { kind: 'error', key: result.error } : { kind: 'idle' },
    );
  };

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteAccount = () => {
    if (deleting) return;
    hapticWarning();
    deleteSheetRef.current?.present();
  };

  const onDeleteAccount = async () => {
    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    // `deleteAccount` already signed out — leave this now-invalid screen rather
    // than wait for the auth-state flip to redirect it from underneath the user.
    router.replace('/');
  };

  const eyeToggle = (shown: boolean, toggle: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shown ? ts.hide : ts.show}
      onPress={toggle}
      hitSlop={8}
    >
      <Ionicons
        name={shown ? 'eye-off-outline' : 'eye-outline'}
        size={18}
        color={theme.colors['muted-foreground']}
      />
    </Pressable>
  );

  return (
    <View style={{ gap: theme.spacing(7), paddingVertical: theme.spacing(5) }}>
      {/* Identity header — same avatar treatment as the account tab this opens
          from (72 / squircle / display name), so the two read as one screen. */}
      <View style={{ gap: theme.spacing(3) }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing(4),
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ta.change}
            onPress={() => void onPickAvatar()}
            disabled={avatarBusy}
            style={{ opacity: avatarBusy ? 0.6 : 1 }}
          >
            <Avatar
              uri={profile.avatarUrl ?? googleAvatarUrl}
              size={72}
              radius={22}
            >
              <AppText
                variant="display"
                style={{ color: theme.colors['primary'] }}
              >
                {profile.initial}
              </AppText>
            </Avatar>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                right: -4,
                bottom: -4,
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors['background'],
                borderWidth: 1,
                borderColor: theme.colors['border'],
              }}
            >
              {avatarBusy ? (
                <Spinner size="small" />
              ) : (
                <Ionicons
                  name="camera"
                  size={15}
                  color={theme.colors['foreground']}
                />
              )}
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: theme.spacing(1) }}>
            <AppText variant="display" numberOfLines={1}>
              {profile.fullName || profile.email.split('@')[0]}
            </AppText>
            <AppText variant="caption" muted numberOfLines={1}>
              {profile.email}
            </AppText>
            {profile.avatarUrl ? (
              // A quiet pill, not a red micro-link under the email: still
              // destructive, but a real touch target.
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ta.remove}
                disabled={avatarBusy}
                onPress={() => {
                  setAvatarFeedback(null);
                  removeAvatarM.mutate();
                }}
                android_ripple={{ color: theme.colors['muted'] }}
                style={({ pressed }) => ({
                  alignSelf: 'flex-start',
                  marginTop: theme.spacing(1),
                  paddingHorizontal: theme.spacing(3),
                  paddingVertical: theme.spacing(1),
                  borderRadius: 999,
                  backgroundColor: surface,
                  overflow: 'hidden',
                  opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.7 : 1,
                })}
              >
                <AppText
                  variant="caption"
                  style={{ color: theme.colors['destructive'] }}
                >
                  {ta.remove}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
        {avatarFeedback === 'saved' ? (
          <FeedbackLine tone="success" text={ta.saved} />
        ) : avatarFeedback === 'error' ? (
          <FeedbackLine tone="error" text={ta.error} />
        ) : null}
      </View>

      <Section title={ds.personalHeading}>
        <Field
          label={t.editNameLabel}
          value={name}
          onChangeText={setName}
          onBlur={() => blurProfileField('fullName')}
          error={
            profileErrors.fullName ? te[profileErrors.fullName] : undefined
          }
        />
        <Field
          label={messages.auth.account.profile.phoneLabel}
          value={phone}
          onChangeText={setPhone}
          onBlur={() => blurProfileField('phone')}
          error={profileErrors.phone ? te[profileErrors.phone] : undefined}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
        <Button
          label={saveM.isPending ? t.editNameSaving : t.editNameSave}
          loading={saveM.isPending}
          onPress={onSaveProfile}
          disabled={!canSave}
          // `ready` supplies the resting (muted) fill; the disabled opacity is
          // overridden so it reads "nothing to save yet", not greyed-out.
          ready={canSave}
          style={canSave ? undefined : { opacity: 1 }}
        />
        {feedback === 'saved' ? (
          <FeedbackLine tone="success" text={t.editNameSaved} />
        ) : feedback === 'error' ? (
          <FeedbackLine tone="error" text={t.editNameError} />
        ) : null}
      </Section>

      {/* Google-only accounts don't get this section at all: with no password
        on file there is nothing to re-prove, and letting an unlocked device
        MINT a first password would create a credential that survives even
        "Sign out of all devices". They sign in with Google, full stop. */}
      {hasPassword ? (
        <Section title={ts.heading}>
          <Field
            label={ts.currentLabel}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            onBlur={() => blurPasswordField('currentPassword')}
            secureTextEntry={!showCurrentPassword}
            // `newPassword`, not `password`: stops the OS offering the saved
            // login credential, so re-auth stays a typed, deliberate action.
            textContentType="newPassword"
            error={
              passwordErrors.currentPassword
                ? te[passwordErrors.currentPassword]
                : undefined
            }
            trailing={eyeToggle(showCurrentPassword, () =>
              setShowCurrentPassword((v) => !v),
            )}
          />
          <Field
            label={ts.newLabel}
            value={newPassword}
            onChangeText={setNewPassword}
            onBlur={() => blurPasswordField('password')}
            secureTextEntry={!showNewPassword}
            textContentType="newPassword"
            error={
              passwordErrors.password ? te[passwordErrors.password] : undefined
            }
            trailing={eyeToggle(showNewPassword, () =>
              setShowNewPassword((v) => !v),
            )}
          />
          {/* Live checklist — turns "too weak" from a verdict into instructions. */}
          <PasswordStrength password={newPassword} />
          <Field
            label={ts.confirmLabel}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => blurPasswordField('confirm')}
            secureTextEntry={!showConfirmPassword}
            textContentType="newPassword"
            error={
              passwordErrors.confirm ? te[passwordErrors.confirm] : undefined
            }
            trailing={eyeToggle(showConfirmPassword, () =>
              setShowConfirmPassword((v) => !v),
            )}
          />
          <Button
            label={passwordSubmitting ? ts.submitting : ts.submit}
            loading={passwordSubmitting}
            onPress={() => void onChangePassword()}
            // Resting until both fields have something — still pressable, so
            // submit-side validation can surface the per-field errors.
            ready={newPassword !== '' && confirmPassword !== ''}
          />
          {passwordDone ? (
            <FeedbackLine
              tone="success"
              // Say that the other devices were signed out — it happened, and a
              // silent session revocation is exactly the kind of surprise that
              // makes people distrust an account screen.
              text={`${ts.success} ${ts.successHint}`}
            />
          ) : passwordError ? (
            <FeedbackLine tone="error" text={te[passwordError]} />
          ) : null}
        </Section>
      ) : null}

      <Section title={ds.connectedHeading} variant="rows">
        {connectedItems.length === 0 ? (
          <View
            style={{
              paddingHorizontal: theme.spacing(5),
              paddingVertical: theme.spacing(4),
            }}
          >
            <AppText variant="caption" muted>
              {tc.none}
            </AppText>
          </View>
        ) : (
          connectedItems.map((p, i) => (
            <View key={p}>
              {i > 0 ? <RowDivider inset /> : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing(3),
                  // Matches SettingsRow's own padding — read-only rows, but the
                  // same rhythm as the tappable ones.
                  paddingHorizontal: theme.spacing(5),
                  paddingVertical: theme.spacing(4),
                  minHeight: 56,
                }}
              >
                <Ionicons
                  name={connectedIcons[p]}
                  size={18}
                  color={theme.colors['muted-foreground']}
                />
                <AppText variant="body" style={{ flex: 1 }}>
                  {connectedLabels[p]}
                </AppText>
                <Badge label={tc.connectedBadge} tone="success" />
              </View>
            </View>
          ))
        )}
        {hasPassword && !providers.includes('email') ? (
          // The account signs in with a password, but Supabase holds no `email`
          // identity for it — so it never appears in the list above. Shown here
          // instead, because leaving it out told the user their password login
          // did not exist. No Disconnect: there is no identity to unlink.
          <View>
            {connectedItems.length > 0 ? <RowDivider inset /> : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing(3),
                paddingHorizontal: theme.spacing(5),
                paddingVertical: theme.spacing(4),
                minHeight: 56,
              }}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.colors['muted-foreground']}
              />
              <View style={{ flex: 1, gap: theme.spacing(1) }}>
                <AppText variant="body">{tc.passwordRow}</AppText>
                <AppText variant="caption" muted>
                  {tc.passwordRowDesc(profile.email)}
                </AppText>
              </View>
              <Badge label={tc.connectedBadge} tone="success" />
            </View>
          </View>
        ) : null}
        {!providers.includes('google') ? (
          <View>
            {connectedItems.length > 0 ? <RowDivider inset /> : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing(3),
                paddingHorizontal: theme.spacing(5),
                paddingVertical: theme.spacing(4),
                minHeight: 56,
              }}
            >
              <Ionicons
                name="logo-google"
                size={18}
                color={theme.colors['muted-foreground']}
              />
              <View style={{ flex: 1, gap: theme.spacing(1) }}>
                <AppText variant="body">{tc.google}</AppText>
                <AppText variant="caption" muted>
                  {tc.connectDesc(tc.google)}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${tc.connect} ${tc.google}`}
                disabled={connectState.kind === 'connecting'}
                onPress={() => void onConnectGoogle()}
                hitSlop={8}
                android_ripple={{ color: theme.colors['muted'] }}
                style={({ pressed }) => ({
                  paddingHorizontal: theme.spacing(3),
                  paddingVertical: theme.spacing(1),
                  borderRadius: 999,
                  backgroundColor: surface,
                  overflow: 'hidden',
                  opacity:
                    connectState.kind === 'connecting'
                      ? 0.5
                      : process.env.EXPO_OS === 'ios' && pressed
                        ? 0.7
                        : 1,
                })}
              >
                <AppText
                  variant="caption"
                  style={{ color: theme.colors['primary'] }}
                >
                  {connectState.kind === 'connecting'
                    ? tc.connecting
                    : tc.connect}
                </AppText>
              </Pressable>
            </View>
            {connectState.kind === 'error' ? (
              <View style={connectFeedbackStyle}>
                <FeedbackLine
                  tone="error"
                  text={`${tc.connectError} ${te[connectState.key]}`}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </Section>

      <View style={{ gap: theme.spacing(2) }}>
        <Section title={ds.dangerHeading} tone="danger" variant="rows">
          <SettingsRow
            label={deleting ? dz.deleting : dz.deleteCta}
            description={dz.deleteDesc}
            icon="trash-outline"
            tone="danger"
            onPress={confirmDeleteAccount}
          />
        </Section>
        {deleteError ? (
          <View style={{ paddingHorizontal: theme.spacing(2) }}>
            <FeedbackLine tone="error" text={deleteError} />
          </View>
        ) : null}
      </View>

      <ConfirmSheet
        ref={deleteSheetRef}
        title={dz.confirmTitle}
        body={dz.confirmBody}
        confirmLabel={dz.confirmCta}
        cancelLabel={dz.cancel}
        onConfirm={() => void onDeleteAccount()}
      />
    </View>
  );
}

/** Loading state shaped like the real screen: identity row, then three groups. */
function SettingsSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(7), paddingVertical: theme.spacing(5) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(4),
        }}
      >
        <Skeleton height={72} width={72} borderRadius={22} />
        <View style={{ flex: 1, gap: theme.spacing(2) }}>
          <Skeleton height={20} width="70%" />
          <Skeleton height={12} width="50%" />
        </View>
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: theme.spacing(2) }}>
          <Skeleton height={12} width="40%" />
          <Skeleton
            height={i === 2 ? 96 : 196}
            borderRadius={theme.radius.xl}
          />
        </View>
      ))}
    </View>
  );
}

/**
 * P5.7-style dedicated settings screen — everything the tab's "Your Profile" row
 * leads to: identity, editable name/phone, change password, connected accounts
 * (read-only) and account deletion. Split out of the account tab (2026-08-19,
 * user request) so the tab itself stays a short menu instead of a page of forms.
 * Regrouped 2026-08-20 into borderless surfaces with hairline fields — the flat
 * stack of boxed forms had no hierarchy, and card chrome only added noise.
 */
export default function AccountSettingsScreen() {
  const theme = useTheme();
  const { status } = useAuth();
  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: status === 'signedIn',
  });

  if (status !== 'signedIn') return <Redirect href="/" />;

  return (
    // paddingTop: 0 — the native header already clears the status bar (same
    // idiom as the legal reader). keyboardAware — the password pair sits at the
    // bottom of the scroll, where the keyboard would otherwise cover it.
    <Screen keyboardAware style={{ paddingTop: 0 }}>
      <Stack.Screen options={{ headerShown: true, title: ds.title }} />
      {profileQ.isPending ? (
        <SettingsSkeleton />
      ) : profileQ.isError || !profileQ.data ? (
        <View
          style={{
            alignItems: 'center',
            gap: theme.spacing(3),
            paddingVertical: theme.spacing(6),
          }}
        >
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.loadError}
          </AppText>
          <Button label={t.retry} onPress={() => profileQ.refetch()} />
        </View>
      ) : (
        <SettingsBody profile={profileQ.data} />
      )}
    </Screen>
  );
}
