import {
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SharedValue } from 'react-native-reanimated';

import { AppText, SectionDivider, color, useTheme } from '@tourism/mobile-ui';

import { RemoteImage } from '../remote-image';
import { ToursAnimatedSearchSection } from './tours-animated-search-section';

type ToursHomeHeaderProps = {
  welcomeLabel: string;
  name: string;
  avatarSource?: ImageSourcePropType;
  avatarUri?: string;
  notificationLabel: string;
  onNotificationPress: () => void;
  sectionTitle: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchActive: boolean;
  hasSubmitted: boolean;
  searchProgress: SharedValue<number>;
  query: string;
  onQueryChange: (value: string) => void;
  onSearchToggle: () => void;
  onSearchResume: () => void;
  onClear: () => void;
  onSubmit: () => void;
  inputRef: React.RefObject<TextInput | null>;
  /** Filter / sort / chips — rendered directly under search as one discovery block. */
  discoveryControls?: React.ReactNode;
};

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function firstNameFrom(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function ToursHomeHeader({
  welcomeLabel,
  name,
  avatarSource,
  avatarUri,
  notificationLabel,
  onNotificationPress,
  sectionTitle,
  searchLabel,
  searchPlaceholder,
  searchActive,
  hasSubmitted,
  searchProgress,
  query,
  onQueryChange,
  onSearchToggle,
  onSearchResume,
  onClear,
  onSubmit,
  inputRef,
  discoveryControls,
}: ToursHomeHeaderProps) {
  const theme = useTheme();
  const muted = color(theme, 'muted-foreground');
  const styles = createStyles(theme);
  const showPhoto = Boolean(avatarUri?.trim());
  const displayName = firstNameFrom(name);

  return (
    <View style={styles.root}>
      <View style={styles.profileRow}>
        <View style={styles.lead}>
          {avatarSource ? (
            <Image
              source={avatarSource}
              style={styles.avatar}
              accessibilityLabel={displayName}
              resizeMode="cover"
            />
          ) : showPhoto && avatarUri ? (
            <RemoteImage
              uri={avatarUri}
              style={styles.avatar}
              imageStyle={styles.avatarImage}
              accessibilityLabel={displayName}
            />
          ) : (
            <View style={styles.avatarFallback} accessibilityLabel={displayName}>
              <AppText variant="caption" style={styles.initials}>
                {initialsFromName(name)}
              </AppText>
            </View>
          )}
          <View style={styles.text}>
            <AppText variant="caption" muted style={styles.welcome}>
              {welcomeLabel}
            </AppText>
            <AppText variant="headline" style={styles.name} numberOfLines={1}>
              {displayName}
            </AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={notificationLabel}
          hitSlop={8}
          onPress={onNotificationPress}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Ionicons name="notifications-outline" size={22} color={muted} />
        </Pressable>
      </View>

      <View style={styles.discovery}>
        <ToursAnimatedSearchSection
          sectionTitle={sectionTitle}
          searchLabel={searchLabel}
          searchPlaceholder={searchPlaceholder}
          searchActive={searchActive}
          hasSubmitted={hasSubmitted}
          searchProgress={searchProgress}
          query={query}
          onQueryChange={onQueryChange}
          onSearchToggle={onSearchToggle}
          onSearchResume={onSearchResume}
          onClear={onClear}
          onSubmit={onSubmit}
          inputRef={inputRef}
          compactBottom={Boolean(discoveryControls)}
        />
        {discoveryControls ? (
          <View style={styles.discoveryControls}>{discoveryControls}</View>
        ) : null}
      </View>

      <SectionDivider />
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  const horizontal = theme.spacing.md;

  return StyleSheet.create({
    root: {
      paddingTop: theme.spacing.md,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      paddingHorizontal: horizontal,
      paddingBottom: theme.spacing.sm,
    },
    lead: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: color(theme, 'muted'),
    },
    avatarImage: {
      width: 44,
      height: 44,
    },
    avatarFallback: {
      width: 44,
      height: 44,
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
      justifyContent: 'center',
      gap: 1,
      minWidth: 0,
    },
    welcome: {
      fontSize: 12,
      lineHeight: 16,
    },
    name: {
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.2,
      fontFamily: theme.fonts.sansSemibold,
    },
    action: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionPressed: {
      opacity: 0.55,
    },
    discovery: {
      gap: theme.spacing.xs,
    },
    discoveryControls: {
      paddingTop: 2,
    },
  });
}
