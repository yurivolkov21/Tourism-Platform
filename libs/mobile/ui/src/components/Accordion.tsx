import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AccordionItem = {
  id: string;
  title: string;
  content: string;
};

type AccordionProps = {
  items: AccordionItem[];
  /** When true, all items start collapsed (default false — first item open). */
  allowNoneOpen?: boolean;
};

export function Accordion({ items, allowNoneOpen = false }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(
    allowNoneOpen ? null : (items[0]?.id ?? null),
  );
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.root}>
      {items.map((item, index) => {
        const open = openId === item.id;
        const isLast = index === items.length - 1;
        return (
          <View
            key={item.id}
            style={[styles.item, isLast ? styles.itemLast : null]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setOpenId(open ? null : item.id);
              }}
              style={styles.header}
            >
              <AppText variant="body" style={styles.title}>
                {item.title}
              </AppText>
              <Ionicons
                name="chevron-down"
                size={20}
                color={color(theme, 'muted-foreground')}
                style={open ? styles.chevronOpen : styles.chevron}
              />
            </Pressable>
            {open ? (
              <AppText variant="body" muted style={styles.body}>
                {item.content}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      backgroundColor: color(theme, 'card'),
    },
    item: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color(theme, 'border'),
    },
    itemLast: {
      borderBottomWidth: 0,
    },
    header: {
      minHeight: theme.minTouch,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    title: {
      flex: 1,
      paddingRight: theme.spacing.sm,
      fontFamily: theme.fonts.sansMedium,
    },
    chevron: {},
    chevronOpen: {
      transform: [{ rotate: '180deg' }],
    },
    body: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      lineHeight: 26,
    },
  });
}

export type { AccordionItem };
