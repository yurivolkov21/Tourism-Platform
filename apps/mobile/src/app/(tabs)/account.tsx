import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  Screen,
  Skeleton,
  TextField,
  useTheme,
} from '@tourism/mobile-ui';
import { AuthGate } from '../../components/auth-gate';
import { SectionHeading } from '../../components/section-heading';
import { useAuth } from '../../lib/auth-context';
import { WEB_URL } from '../../lib/env';
import { fetchProfile, updateProfile, type ProfileVm } from '../../lib/profile';

const t = messages.mobile.account;
const tp = messages.mobile.authPrompts;

function MenuRow({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
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
        paddingVertical: theme.spacing(3),
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={color} />
      <AppText variant="body" style={{ flex: 1, color }}>
        {label}
      </AppText>
      {!destructive ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors['muted-foreground']}
        />
      ) : null}
    </Pressable>
  );
}

function Profile({ profile }: { profile: ProfileVm }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const [name, setName] = useState(profile.fullName);
  const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null);

  const saveM = useMutation({
    mutationFn: updateProfile,
    onSuccess: (vm) => {
      queryClient.setQueryData(['profile'], vm);
      setFeedback('saved');
    },
    onError: () => setFeedback('error'),
  });

  return (
    <View style={{ gap: theme.spacing(5), paddingVertical: theme.spacing(4) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(3),
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors['secondary'],
          }}
        >
          <AppText variant="title" style={{ color: theme.colors['primary'] }}>
            {profile.initial}
          </AppText>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="title" numberOfLines={1}>
            {profile.fullName || profile.email}
          </AppText>
          <AppText variant="caption" muted numberOfLines={1}>
            {profile.email}
          </AppText>
        </View>
      </View>

      <View style={{ gap: theme.spacing(2) }}>
        <TextField
          label={t.editNameLabel}
          value={name}
          onChangeText={setName}
        />
        <Button
          label={saveM.isPending ? t.editNameSaving : t.editNameSave}
          loading={saveM.isPending}
          onPress={() => {
            setFeedback(null);
            saveM.mutate(name.trim());
          }}
          disabled={name.trim() === '' || name.trim() === profile.fullName}
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

      <View>
        <MenuRow
          icon="receipt-outline"
          label={messages.booking.list.menuLink}
          onPress={() => router.push('/trips')}
        />
        <MenuRow
          icon="heart-outline"
          label={t.menuSaved}
          onPress={() => router.push('/saved')}
        />
        <MenuRow
          icon="shield-checkmark-outline"
          label={t.menuPrivacy}
          onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}
        />
        <MenuRow
          icon="document-text-outline"
          label={t.menuTerms}
          onPress={() => Linking.openURL(`${WEB_URL}/terms`)}
        />
        <MenuRow
          icon="log-out-outline"
          label={t.signOut}
          destructive
          onPress={() => signOut()}
        />
      </View>
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
      <View style={{ paddingTop: theme.spacing(4) }}>
        <SectionHeading title={messages.auth.account.title} />
      </View>
      {profileQ.isPending ? (
        <View style={{ gap: theme.spacing(3) }}>
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
        <Animated.View entering={FadeIn.duration(200)}>
          <Profile profile={profileQ.data} />
        </Animated.View>
      )}
    </Screen>
  );
}
