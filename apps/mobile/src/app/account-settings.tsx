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
  Button,
  ConfirmSheet,
  Screen,
  Skeleton,
  Spinner,
  TextField,
  useTheme,
  type ConfirmSheetRef,
} from '@tourism/mobile-ui';
import { removeAvatar, uploadAvatar } from '../lib/avatar';
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
import { buildUpdateProfilePayload } from '../lib/profile-form';

const t = messages.mobile.account;
const te = messages.mobile.authErrors;
const ts = messages.auth.account.securityPage.password;
const tc = messages.auth.account.connected;
const ds = messages.auth.account.settings;
const dz = messages.auth.account.danger;

/** Section label + optional description — same shape across all four groups below. */
function SectionHead({
  title,
  description,
  tone,
}: {
  title: string;
  description?: string;
  tone?: 'danger';
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <AppText
        variant="title"
        style={
          tone === 'danger' ? { color: theme.colors['destructive'] } : undefined
        }
      >
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption" muted>
          {description}
        </AppText>
      ) : null}
    </View>
  );
}

const ta = messages.auth.account.profile.avatar;

function SettingsBody({ profile }: { profile: ProfileVm }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { providers, changePassword, deleteAccount, googleAvatarUrl } =
    useAuth();
  const [name, setName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null);
  const deleteSheetRef = useRef<ConfirmSheetRef>(null);

  // Enables Save only once something actually changed — trimmed, matching what
  // `buildUpdateProfilePayload` sends, so a trailing space alone doesn't count.
  const dirty =
    name.trim() !== profile.fullName || phone.trim() !== profile.phone;

  const saveM = useMutation({
    mutationFn: updateProfile,
    onSuccess: (vm) => {
      queryClient.setQueryData(['profile'], vm);
      setFeedback('saved');
    },
    onError: () => setFeedback('error'),
  });

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

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<ChangePasswordErrors>(
    {},
  );
  const [passwordFeedback, setPasswordFeedback] = useState<
    'saved' | 'error' | null
  >(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const onChangePassword = async () => {
    const errors = validateChangePassword({
      password: newPassword,
      confirm: confirmPassword,
    });
    setPasswordErrors(errors);
    setPasswordFeedback(null);
    if (Object.keys(errors).length > 0) return;

    setPasswordSubmitting(true);
    const result = await changePassword(newPassword);
    setPasswordSubmitting(false);
    if (result.error) {
      setPasswordFeedback('error');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordFeedback('saved');
  };

  const connectedLabels: Record<string, string> = {
    google: tc.google,
    email: tc.email,
  };
  const connectedItems = providers.filter((p) => p in connectedLabels);

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

  return (
    <View style={{ gap: theme.spacing(6), paddingVertical: theme.spacing(4) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(3),
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
            size={56}
            radius={28}
          >
            <AppText variant="title" style={{ color: theme.colors['primary'] }}>
              {profile.initial}
            </AppText>
          </Avatar>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 24,
              height: 24,
              borderRadius: 12,
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
                size={13}
                color={theme.colors['foreground']}
              />
            )}
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="title" numberOfLines={1}>
            {profile.fullName || profile.email}
          </AppText>
          <AppText variant="caption" muted numberOfLines={1}>
            {profile.email}
          </AppText>
          {profile.avatarUrl ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ta.remove}
              disabled={avatarBusy}
              onPress={() => {
                setAvatarFeedback(null);
                removeAvatarM.mutate();
              }}
              hitSlop={8}
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
        <AppText variant="caption" style={{ color: theme.colors['success'] }}>
          {ta.saved}
        </AppText>
      ) : avatarFeedback === 'error' ? (
        <AppText
          variant="caption"
          style={{ color: theme.colors['destructive'] }}
        >
          {ta.error}
        </AppText>
      ) : null}

      <View style={{ gap: theme.spacing(2) }}>
        <SectionHead title={ds.personalHeading} description={ds.personalDesc} />
        <TextField
          label={t.editNameLabel}
          value={name}
          onChangeText={setName}
        />
        <TextField
          label={messages.auth.account.profile.phoneLabel}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
        <Button
          label={saveM.isPending ? t.editNameSaving : t.editNameSave}
          loading={saveM.isPending}
          onPress={() => {
            setFeedback(null);
            saveM.mutate(buildUpdateProfilePayload({ fullName: name, phone }));
          }}
          disabled={name.trim() === '' || !dirty}
        />
        {feedback === 'saved' ? (
          <AppText variant="caption" style={{ color: theme.colors['success'] }}>
            {t.editNameSaved}
          </AppText>
        ) : feedback === 'error' ? (
          <AppText
            variant="caption"
            style={{ color: theme.colors['destructive'] }}
          >
            {t.editNameError}
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: theme.spacing(2) }}>
        <SectionHead title={ts.heading} />
        <TextField
          label={ts.newLabel}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNewPassword}
          textContentType="newPassword"
          error={
            passwordErrors.password ? te[passwordErrors.password] : undefined
          }
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showNewPassword ? ts.hide : ts.show}
              onPress={() => setShowNewPassword((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.colors['muted-foreground']}
              />
            </Pressable>
          }
        />
        <TextField
          label={ts.confirmLabel}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          textContentType="newPassword"
          error={
            passwordErrors.confirm ? te[passwordErrors.confirm] : undefined
          }
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? ts.hide : ts.show}
              onPress={() => setShowConfirmPassword((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.colors['muted-foreground']}
              />
            </Pressable>
          }
        />
        <Button
          label={passwordSubmitting ? ts.submitting : ts.submit}
          loading={passwordSubmitting}
          onPress={() => void onChangePassword()}
        />
        {passwordFeedback === 'saved' ? (
          <AppText variant="caption" style={{ color: theme.colors['success'] }}>
            {ts.success}
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: theme.spacing(2) }}>
        <SectionHead
          title={ds.connectedHeading}
          description={ds.connectedDesc}
        />
        {connectedItems.length === 0 ? (
          <AppText variant="caption" muted>
            {tc.none}
          </AppText>
        ) : (
          connectedItems.map((p) => (
            <View
              key={p}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing(2),
                paddingVertical: theme.spacing(1),
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors['success']}
              />
              <AppText variant="body">{connectedLabels[p]}</AppText>
            </View>
          ))
        )}
      </View>

      <View style={{ gap: theme.spacing(2) }}>
        <SectionHead
          title={ds.dangerHeading}
          description={ds.dangerDesc}
          tone="danger"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dz.deleteCta}
          onPress={confirmDeleteAccount}
          android_ripple={{ color: theme.colors['muted'] }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing(2),
            paddingVertical: theme.spacing(2),
            opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.7 : 1,
          })}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={theme.colors['destructive']}
          />
          <AppText
            variant="body"
            style={{ color: theme.colors['destructive'] }}
          >
            {deleting ? dz.deleting : dz.deleteCta}
          </AppText>
        </Pressable>
        {deleteError ? (
          <AppText
            variant="caption"
            style={{ color: theme.colors['destructive'] }}
          >
            {deleteError}
          </AppText>
        ) : null}
      </View>

      <ConfirmSheet
        ref={deleteSheetRef}
        icon={
          <Ionicons
            name="trash-outline"
            size={22}
            color={theme.colors['destructive']}
          />
        }
        title={dz.confirmTitle}
        body={dz.confirmBody}
        confirmLabel={dz.confirmCta}
        cancelLabel={dz.cancel}
        onConfirm={() => void onDeleteAccount()}
      />
    </View>
  );
}

/**
 * P5.7-style dedicated settings screen — everything the tab's "Your Profile" row
 * leads to: identity, editable name/phone, change password, connected accounts
 * (read-only) and account deletion. Split out of the account tab (2026-08-19,
 * user request) so the tab itself stays a short menu instead of a page of forms.
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
    // idiom as the legal reader).
    <Screen style={{ paddingTop: 0 }}>
      <Stack.Screen options={{ headerShown: true, title: ds.title }} />
      {profileQ.isPending ? (
        <View
          style={{ gap: theme.spacing(3), paddingVertical: theme.spacing(4) }}
        >
          <Skeleton height={56} borderRadius={28} width={56} />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </View>
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
