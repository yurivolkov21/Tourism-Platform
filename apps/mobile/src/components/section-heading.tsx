import { View } from 'react-native';
import { AppText, useTheme } from '@tourism/mobile-ui';

/** Web section rhythm: eyebrow caption + Fraunces title + muted subtitle. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1), marginBottom: theme.spacing(3) }}>
      {eyebrow ? (
        <AppText
          variant="caption"
          style={{
            color: theme.colors['primary'],
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            fontFamily: theme.fontFamilies.sansSemiBold,
          }}
        >
          {eyebrow}
        </AppText>
      ) : null}
      <AppText variant="title">{title}</AppText>
      {subtitle ? (
        <AppText variant="body" muted>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
