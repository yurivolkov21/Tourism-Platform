import { Image, Pressable, type PressableProps } from 'react-native';
import { AppText } from './app-text';
import { useTheme } from './theme-provider';

export interface ChipProps extends Omit<PressableProps, 'children'> {
  label: string;
  selected?: boolean;
  /** Optional small round leading image (e.g. destination cover). */
  imageUri?: string;
}

export function Chip({ label, selected = false, imageUri, style, ...rest }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      android_ripple={{
        color: selected ? theme.colors['primary-foreground'] : theme.colors['muted'],
        foreground: true,
      }}
      {...rest}
      style={(state) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(2),
          minHeight: 36,
          paddingHorizontal: theme.spacing(3),
          borderRadius: 999,
          overflow: 'hidden', // clip the ripple to the capsule
          borderWidth: 1,
          borderColor: selected ? theme.colors['primary'] : theme.colors['border'],
          backgroundColor: selected ? theme.colors['primary'] : 'transparent',
          opacity: process.env.EXPO_OS === 'ios' && state.pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors['muted'] }}
        />
      ) : null}
      <AppText
        variant="caption"
        style={{
          fontFamily: theme.fontFamilies.sansSemiBold,
          color: selected ? theme.colors['primary-foreground'] : theme.colors['foreground'],
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
