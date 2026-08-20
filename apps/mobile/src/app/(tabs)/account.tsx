import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Avatar,
  Button,
  ConfirmSheet,
  Screen,
  Skeleton,
  useTheme,
  type ConfirmSheetRef,
} from '@tourism/mobile-ui';
import { AuthGate } from '../../components/auth-gate';
import { useAuth } from '../../lib/auth-context';
import { hapticWarning } from '../../lib/haptics';
import { fetchProfile, type ProfileVm } from '../../lib/profile';

const t = messages.mobile.account;
const tp = messages.mobile.authPrompts;

/**
 * A plain menu line: label, chevron, hairline underneath. No leading icon — the
 * list reads as a column of destinations, and icons only add noise at this size.
 */
function MenuRow({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  const color = destructive
    ? theme.colors['destructive']
    : theme.colors['foreground'];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: theme.colors['muted'] }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        // 28 + 28 + a 22pt line ≈ the 78pt row height the reference uses — the
        // airiness is what makes that list read as calm rather than cramped.
        paddingVertical: theme.spacing(7),
        borderBottomWidth: 1,
        borderBottomColor: theme.colors['border'],
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.7 : 1,
      })}
    >
      <AppText variant="body" style={{ flex: 1, color }}>
        {label}
      </AppText>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={destructive ? color : theme.colors['muted-foreground']}
      />
    </Pressable>
  );
}

/**
 * The one promoted row: a filled tile with the chevron in its own inset square,
 * so the entry point to account settings reads as a destination rather than one
 * more line in the list below it.
 */
function ProfileTile({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: theme.colors['muted'] }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: theme.spacing(4),
        paddingRight: theme.spacing(2),
        paddingVertical: theme.spacing(2),
        minHeight: 60,
        borderRadius: 18,
        backgroundColor: theme.colors['card'],
        overflow: 'hidden', // clip the Android ripple to the rounded shape
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.7 : 1,
      })}
    >
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: theme.radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['secondary'],
        }}
      >
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors['foreground']}
        />
      </View>
    </Pressable>
  );
}

/**
 * Short menu, not a page of forms — editing (name/phone, password, connected
 * accounts, delete) all lives behind the "Your Profile" row on its own screen
 * (`account-settings.tsx`), split out 2026-08-19 at the user's request.
 */
function Profile({ profile }: { profile: ProfileVm }) {
  const theme = useTheme();
  const { signOut, googleAvatarUrl } = useAuth();
  const signOutSheetRef = useRef<ConfirmSheetRef>(null);

  const confirmSignOut = () => {
    hapticWarning();
    signOutSheetRef.current?.present();
  };

  return (
    <View style={{ gap: theme.spacing(6), paddingVertical: theme.spacing(4) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(4),
        }}
      >
        <Avatar
          uri={profile.avatarUrl ?? googleAvatarUrl}
          size={72}
          radius={22}
        >
          <AppText variant="display" style={{ color: theme.colors['primary'] }}>
            {profile.initial}
          </AppText>
        </Avatar>
        <View style={{ flex: 1, gap: theme.spacing(1) }}>
          <AppText variant="display" numberOfLines={1}>
            {profile.fullName || profile.email.split('@')[0]}
          </AppText>
          <AppText variant="caption" muted numberOfLines={1}>
            {profile.email}
          </AppText>
        </View>
      </View>

      <ProfileTile
        label={t.menuProfile}
        onPress={() => router.push('/account-settings')}
      />

      <View>
        <MenuRow
          label={messages.booking.list.menuLink}
          onPress={() => router.push('/trips')}
        />
        <MenuRow label={t.menuSaved} onPress={() => router.push('/saved')} />
        <MenuRow
          label={t.menuSettings}
          onPress={() => router.push('/app-settings')}
        />
        {/* One Legal row in place of the three policy rows (2026-08-20) — the
            docs themselves are still native screens over the shared LegalDoc
            source, now behind `legal/index`. */}
        <MenuRow label={t.menuLegal} onPress={() => router.push('/legal')} />
        <MenuRow label={t.signOut} destructive onPress={confirmSignOut} />
      </View>

      <ConfirmSheet
        ref={signOutSheetRef}
        title={t.signOutConfirmTitle}
        body={t.signOutConfirmBody}
        confirmLabel={t.signOutConfirmCta}
        cancelLabel={t.stayIn}
        onConfirm={() => signOut()}
      />
    </View>
  );
}

export default function AccountScreen() {
  const theme = useTheme();
  const { status } = useAuth();
  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: status === 'signedIn',
  });

  if (status !== 'signedIn') {
    return (
      <Screen scroll={false}>
        <AuthGate
          icon="person-circle-outline"
          title={tp.accountGateTitle}
          body={tp.accountGateBody}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {profileQ.isPending ? (
        <View style={{ gap: theme.spacing(3), paddingTop: theme.spacing(4) }}>
          <Skeleton height={72} borderRadius={22} width={72} />
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
        <Animated.View entering={FadeIn.duration(200)}>
          <Profile profile={profileQ.data} />
        </Animated.View>
      )}
    </Screen>
  );
}
