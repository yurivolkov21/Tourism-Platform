import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../lib/theme';

interface AuthButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
}

export function AuthButton({
  label,
  loading,
  variant = 'primary',
  style,
  disabled,
  ...props
}: AuthButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        (disabled || loading) ? styles.disabled : undefined,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? theme.colors.textOnPrimary : theme.colors.primary}
          size="small"
        />
      ) : (
        <Text
          style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: theme.font.md,
    fontWeight: '600',
  },
  labelPrimary: {
    color: theme.colors.textOnPrimary,
  },
  labelGhost: {
    color: theme.colors.primary,
  },
});
