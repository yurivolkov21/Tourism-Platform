import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './app-text';
import { useTheme } from './theme-provider';

export interface AccordionProps {
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

export function Accordion({ title, children, initiallyOpen = false }: AccordionProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors['border'],
        borderRadius: theme.radius.md,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={(state) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing(2),
          padding: theme.spacing(3),
          backgroundColor: state.pressed ? theme.colors['muted'] : 'transparent',
        })}
      >
        <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold, flex: 1 }}>
          {title}
        </AppText>
        <AppText variant="body" muted>
          {open ? '−' : '+'}
        </AppText>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: theme.spacing(3), paddingBottom: theme.spacing(3) }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
