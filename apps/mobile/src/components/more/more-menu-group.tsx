import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableRow, color, useTheme } from '@tourism/mobile-ui';

type MoreMenuGroupProps = {
  children: ReactNode;
};

/** Icon-free menu card — full-width dividers (More tab reference layout). */
export function MoreMenuGroup({ children }: MoreMenuGroupProps) {
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
            {cloneElement(child, { grouped: true, showChevron: true, comfortable: true })}
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
      marginLeft: theme.spacing.md,
      height: StyleSheet.hairlineWidth,
      backgroundColor: color(theme, 'border'),
    },
  });
}
