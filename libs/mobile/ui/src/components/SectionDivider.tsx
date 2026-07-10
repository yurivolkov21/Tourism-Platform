import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type SectionDividerProps = {
  style?: StyleProp<ViewStyle>;
};

/** Inset hairline between screen header sections — bookmark / tours home style. */
export function SectionDivider({ style }: SectionDividerProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return <View style={[styles.root, style]} />;
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: theme.spacing.md,
      backgroundColor: color(theme, 'border'),
    },
  });
}
