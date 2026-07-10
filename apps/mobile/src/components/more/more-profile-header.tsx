import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText, color, useTheme } from '@tourism/mobile-ui';

import { RemoteImage } from '../remote-image';

type MoreProfileHeaderProps = {
  name: string;
  location: string;
  locationFlag: string;
  logoutLabel: string;
  onLogoutPress: () => void;
  /** Local bundled asset (preferred for demo content). */
  avatarSource?: ImageSourcePropType;
  /** When omitted, shows initials from `name`. */
  avatarUri?: string;
};

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function MoreProfileHeader({
  name,
  location,
  locationFlag,
  logoutLabel,
  onLogoutPress,
  avatarSource,
  avatarUri,
}: MoreProfileHeaderProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const showPhoto = Boolean(avatarUri?.trim());

  return (
    <View style={styles.root}>
      {avatarSource ? (
        <Image
          source={avatarSource}
          style={styles.avatar}
          accessibilityLabel={name}
          resizeMode="cover"
        />
      ) : showPhoto && avatarUri ? (
        <RemoteImage
          uri={avatarUri}
          style={styles.avatar}
          imageStyle={styles.avatarImage}
          accessibilityLabel={name}
        />
      ) : (
        <View style={styles.avatarFallback} accessibilityLabel={name}>
          <AppText variant="headline" style={styles.initials}>
            {initialsFromName(name)}
          </AppText>
        </View>
      )}
      <View style={styles.text}>
        <AppText variant="headline" style={styles.name}>
          {name}
        </AppText>
        <View style={styles.locationRow}>
          <AppText style={styles.flag}>{locationFlag}</AppText>
          <AppText variant="caption" muted style={styles.location}>
            {location}
          </AppText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={logoutLabel}
        onPress={onLogoutPress}
        hitSlop={10}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
      >
        <Ionicons
          name="log-out-outline"
          size={22}
          color={color(theme, 'muted-foreground')}
        />
      </Pressable>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: color(theme, 'muted'),
    },
    avatarImage: {
      width: 64,
      height: 64,
    },
    avatarFallback: {
      width: 64,
      height: 64,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'muted'),
    },
    initials: {
      color: color(theme, 'foreground'),
      fontFamily: theme.fonts.sansSemibold,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    name: {
      letterSpacing: -0.3,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    flag: {
      fontSize: 12,
      lineHeight: 16,
    },
    location: {
      fontSize: 13,
      lineHeight: 16,
    },
    logoutButton: {
      width: theme.minTouch,
      height: theme.minTouch,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoutPressed: {
      opacity: 0.55,
    },
  });
}
