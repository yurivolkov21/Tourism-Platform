import { Alert, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { messages } from '@tourism/i18n';
import { AppText, PressableRow, useTheme } from '@tourism/mobile-ui';

import { TabScreen } from '../../components/tab-screen';
import { NexoraLogo } from '../../components/brand/nexora-logo';
import { MoreMenuGroup } from '../../components/more/more-menu-group';
import { MoreMenuSection } from '../../components/more/more-menu-section';
import { MoreProfileHeader } from '../../components/more/more-profile-header';
import { useAuth } from '../../lib/auth/auth-provider';

const demoAvatar = require('../../../assets/images/avatar-dog.png');

export default function MoreScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = messages.mobile.more;
  const at = messages.mobile.auth;
  const profile = t.profile;
  const styles = createStyles(theme);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const { status, user, signOut } = useAuth();
  const signedIn = status === 'signedIn';

  const openAccountPreview = () => {
    if (!signedIn) {
      router.push('/(auth)/login');
      return;
    }
    Alert.alert(t.accountCard.title, user?.email ?? t.accountCard.comingSoon);
  };

  const openMenuPreview = (title: string) => {
    Alert.alert(title, t.menuComingSoon);
  };

  const onLogoutPress = () => {
    if (signedIn) {
      void signOut();
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <TabScreen largeTitle={false}>
      <MoreProfileHeader
        name={signedIn ? (user?.email ?? profile.name) : profile.name}
        location={profile.location}
        locationFlag={profile.locationFlag}
        avatarSource={demoAvatar}
        logoutLabel={signedIn ? at.signOut : at.signInCta}
        onLogoutPress={onLogoutPress}
      />

      <MoreMenuSection title={t.account}>
        <MoreMenuGroup>
          <PressableRow label={t.accountCard.title} onPress={openAccountPreview} />
          <PressableRow label={t.payment} onPress={() => openMenuPreview(t.payment)} />
          <PressableRow label={t.settings} onPress={() => openMenuPreview(t.settings)} />
        </MoreMenuGroup>
      </MoreMenuSection>

      <MoreMenuSection title={t.support}>
        <MoreMenuGroup>
          <PressableRow label={t.contact} onPress={() => router.push('/contact')} />
          <PressableRow label={t.faq} onPress={() => router.push('/faq')} />
          <PressableRow label={t.about} onPress={() => router.push('/about')} />
        </MoreMenuGroup>
      </MoreMenuSection>

      <MoreMenuSection title={t.legal}>
        <MoreMenuGroup>
          <PressableRow label={t.privacy} onPress={() => router.push('/privacy')} />
          <PressableRow label={t.terms} onPress={() => router.push('/terms')} />
        </MoreMenuGroup>
      </MoreMenuSection>

      <View style={styles.footer}>
        <NexoraLogo size={24} />
        <AppText variant="caption" muted style={styles.footerText}>
          {t.footerTagline}
        </AppText>
        <AppText variant="caption" muted>
          {t.versionLabel(version)}
        </AppText>
      </View>
    </TabScreen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    footer: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    footerText: {
      textAlign: 'center',
    },
  });
}
