import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { AppText } from './app-text';
import { Spinner } from './spinner';
import { useTheme } from './theme-provider';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'outline';
  loading?: boolean;
  /** P5.6 two-tier readiness: `false` = resting (muted) treatment while a form
   * is incomplete. A validity AFFORDANCE, not disabled — press still fires so
   * submit-side validation can surface per-field errors. Default `true`. */
  ready?: boolean;
  /** Leading icon rendered before the label (hidden while `loading`). */
  icon?: ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  loading,
  disabled,
  ready = true,
  icon,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const resting = primary && !ready;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      // Muted ripple is invisible on the emerald fill — use the primary pair there.
      android_ripple={{
        color: primary
          ? theme.colors['primary-foreground']
          : theme.colors['muted'],
        foreground: true,
      }}
      {...rest}
      style={(state) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing(2),
          minHeight: 44,
          paddingHorizontal: theme.spacing(5),
          borderRadius: theme.radius.md,
          overflow: 'hidden', // clip the ripple to the rounded shape
          backgroundColor: resting
            ? theme.colors['secondary']
            : primary
              ? theme.colors['primary']
              : 'transparent',
          borderWidth: primary ? 0 : 1,
          borderColor: theme.colors['border'],
          opacity: disabled
            ? 0.5
            : process.env.EXPO_OS === 'ios' && state.pressed
              ? 0.85
              : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {loading ? <Spinner size="small" /> : icon}
      <AppText
        variant="body"
        // A button label is one line by definition. Without this it wraps when
        // the parent measures narrow (bottom sheets size dynamically, so the
        // first pass can be short) and the second line is eaten by the row's
        // `overflow: hidden` — "Yes, delete my account" rendered as
        // "Yes, delete my". `flexShrink` lets it ellipsize instead of clip.
        numberOfLines={1}
        style={{
          flexShrink: 1,
          textAlign: 'center',
          fontFamily: theme.fontFamilies.sansSemiBold,
          color: resting
            ? theme.colors['muted-foreground']
            : primary
              ? theme.colors['primary-foreground']
              : theme.colors['foreground'],
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
