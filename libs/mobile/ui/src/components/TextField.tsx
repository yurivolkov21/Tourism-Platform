import { forwardRef, useRef, useState, type RefObject } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type View as ViewType,
} from 'react-native';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  /** Optional ref to the inner TextInput (e.g. focus-next chaining). */
  inputRef?: RefObject<TextInput | null>;
};

export const TextField = forwardRef<ViewType, TextFieldProps>(function TextField(
  { label, error, style, onFocus, onBlur, inputRef: inputRefProp, ...rest },
  ref,
) {
  const theme = useTheme();
  const internalInputRef = useRef<TextInput>(null);
  const inputRef = inputRefProp ?? internalInputRef;
  const [focused, setFocused] = useState(false);
  const styles = createStyles(theme, focused);

  return (
    <View ref={ref} style={styles.wrap} collapsable={false}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        ref={inputRef}
        placeholderTextColor={color(theme, 'muted-foreground')}
        style={[styles.input, style]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

function createStyles(theme: ReturnType<typeof useTheme>, focused: boolean) {
  return StyleSheet.create({
    wrap: { gap: theme.spacing.xs },
    label: { color: color(theme, 'foreground'), fontFamily: theme.fonts.sansMedium },
    input: {
      minHeight: theme.minTouch,
      borderWidth: 1,
      borderColor: focused ? color(theme, 'primary') : color(theme, 'input'),
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      fontFamily: theme.fonts.sans,
      fontSize: theme.typography.body,
      color: color(theme, 'foreground'),
      backgroundColor: focused ? color(theme, 'muted') : color(theme, 'card'),
    },
    error: { color: color(theme, 'destructive') },
  });
}
