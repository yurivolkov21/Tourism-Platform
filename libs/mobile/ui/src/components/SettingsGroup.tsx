import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';
import { PressableRow } from './PressableRow';

type SettingsGroupProps = {
  children: ReactNode;
};

export function SettingsGroup({ children }: SettingsGroupProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<
    React.ComponentProps<typeof PressableRow>
  >[];

  return (
    <View style={styles.card}>
      {rows.map((child, index) => {
        const isLast = index === rows.length - 1;
        return (
          <View key={child.key ?? index}>
            {cloneElement(child, { grouped: true })}
            {!isLast ? <View style={styles.separator} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: color(theme, 'card'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
    },
    separator: {
      marginLeft: theme.spacing.md + 28 + theme.spacing.sm,
      height: StyleSheet.hairlineWidth,
      backgroundColor: color(theme, 'border'),
    },
  });
}
