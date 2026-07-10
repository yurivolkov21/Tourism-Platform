import { type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';

type PageIntroProps = PropsWithChildren<{
  text?: string;
}>;

export function PageIntro({ text, children }: PageIntroProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const content =
    children ??
    (text != null ? (
      <AppText variant="body" muted>
        {text}
      </AppText>
    ) : null);

  if (content == null) return null;

  return <View style={styles.root}>{content}</View>;
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
  });
}
