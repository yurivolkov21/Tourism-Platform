import { type PropsWithChildren } from 'react';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { color as resolveColor, type AppTheme } from '../theme/theme';

type TextVariant =
  | 'largeTitle'
  | 'title'
  | 'headline'
  | 'sectionTitle'
  | 'subhead'
  | 'bodyLarge'
  | 'body'
  | 'caption';

type AppTextProps = PropsWithChildren<
  {
    variant?: TextVariant;
    muted?: boolean;
    /** Use Fraunces (web `font-heading`) instead of Geist. */
    serif?: boolean;
    style?: StyleProp<TextStyle>;
  } & Pick<TextProps, 'numberOfLines'>
>;

export function AppText({
  variant = 'body',
  muted = false,
  serif = false,
  style,
  numberOfLines,
  children,
}: AppTextProps) {
  const theme = useTheme();
  const styles = createTextStyles(theme);
  const serifHeading =
    serif && variant === 'title' ? styles.serifHeading : null;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        styles[variant],
        serifHeading,
        muted ? styles.muted : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

function createTextStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: {
      color: resolveColor(theme, 'foreground'),
      fontFamily: theme.fonts.sans,
    },
    serifHeading: {
      fontFamily: theme.fonts.headingSemibold,
    },
    title: {
      fontFamily: theme.fonts.sansSemibold,
      fontSize: theme.typography.title,
      lineHeight: 36,
      letterSpacing: -0.75,
    },
    largeTitle: {
      fontFamily: theme.fonts.heading,
      fontSize: theme.typography.largeTitle,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    headline: {
      fontFamily: theme.fonts.sansSemibold,
      fontSize: theme.typography.headline,
      lineHeight: 32,
    },
    sectionTitle: {
      fontFamily: theme.fonts.headingSemibold,
      fontSize: theme.typography.subheading,
      lineHeight: 28,
    },
    subhead: {
      fontFamily: theme.fonts.sansSemibold,
      fontSize: theme.typography.subheading,
      lineHeight: 28,
    },
    bodyLarge: {
      fontSize: theme.typography.bodyLarge,
      lineHeight: 28,
    },
    body: {
      fontSize: theme.typography.body,
      lineHeight: 24,
    },
    caption: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
    },
    muted: {
      color: resolveColor(theme, 'muted-foreground'),
    },
  });
}

export { AppText as Text };
