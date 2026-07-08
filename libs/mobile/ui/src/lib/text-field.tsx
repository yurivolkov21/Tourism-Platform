import { forwardRef, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from './app-text';
import { useTheme } from './theme-provider';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  /** Error copy shown under the field; also colors the border. */
  error?: string;
  /** Leading adornment inside the field (e.g. a search icon). */
  leading?: ReactNode;
}

/** Ref forwards to the inner TextInput (return-key focus chaining). */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, leading, multiline, style, ...rest },
  ref,
) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1) }}>
      {label ? (
        <AppText variant="caption" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
          {label}
        </AppText>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: theme.spacing(2),
          minHeight: multiline ? 100 : 44,
          borderWidth: 1,
          borderColor: error ? theme.colors['destructive'] : theme.colors['border'],
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing(3),
          paddingVertical: multiline ? theme.spacing(2) : 0,
          backgroundColor: theme.colors['background'],
        }}
      >
        {leading}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.colors['muted-foreground']}
          multiline={multiline}
          {...rest}
          style={[
            {
              flex: 1,
              color: theme.colors['foreground'],
              textAlignVertical: multiline ? 'top' : 'center',
              fontSize: theme.typography.body.fontSize,
              fontFamily: theme.fontFamilies.sans,
              paddingVertical: 0,
            },
            style,
          ]}
        />
      </View>
      {error ? (
        <AppText variant="caption" style={{ color: theme.colors['destructive'] }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});
