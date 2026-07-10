import { type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText, color, useTheme } from '@tourism/mobile-ui';

type TabBarIconProps = {
  name: ComponentProps<typeof Ionicons>['name'];
  color: string;
  size?: number;
  badge?: number;
};

export function TabBarIcon({ name, color: iconColor, size = 24, badge }: TabBarIconProps) {
  const theme = useTheme();
  const showBadge = badge != null && badge > 0;
  const badgeLabel = badge != null && badge > 9 ? '9+' : String(badge ?? '');

  return (
    <View style={styles.wrap}>
      <Ionicons name={name} size={size} color={iconColor} />
      {showBadge ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: color(theme, 'primary'),
              borderColor: color(theme, 'card'),
            },
          ]}
        >
          <AppText
            variant="caption"
            style={[styles.badgeText, { color: color(theme, 'primary-foreground') }]}
          >
            {badgeLabel}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
  },
});
