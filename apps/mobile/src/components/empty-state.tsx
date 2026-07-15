import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, useTheme } from '@tourism/mobile-ui';

/**
 * P5.6: ONE empty-state shape for the whole app (Navel reuses a single
 * headline + subtext pattern everywhere — Screens 21/43/45). Copy comes from
 * the existing i18n strings of each screen.
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Optional CTA below the copy. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        gap: theme.spacing(3),
        paddingVertical: theme.spacing(10),
        paddingHorizontal: theme.spacing(6),
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['secondary'],
        }}
      >
        <Ionicons name={icon} size={30} color={theme.colors['primary']} />
      </View>
      <AppText
        variant="title"
        style={{
          fontFamily: theme.fontFamilies.headingBold,
          textAlign: 'center',
        }}
      >
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="body" muted style={{ textAlign: 'center' }}>
          {subtitle}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}
