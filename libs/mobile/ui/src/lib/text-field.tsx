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
  /** P5.7 S2: `underline` = Navel-style hairline field (icon + placeholder,
   * no box, no visible label — pass `placeholder`; a11y falls back to it). */
  variant?: 'boxed' | 'underline';
}

/** Ref forwards to the inner TextInput (return-key focus chaining). */
export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField(
    { label, error, leading, multiline, variant = 'boxed', style, ...rest },
    ref,
  ) {
    const theme = useTheme();
    const underline = variant === 'underline';
    return (
      <View style={{ gap: theme.spacing(1) }}>
        {label && !underline ? (
          <AppText
            variant="caption"
            style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
          >
            {label}
          </AppText>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: multiline ? 'flex-start' : 'center',
            gap: theme.spacing(underline ? 3 : 2),
            minHeight: multiline ? 100 : underline ? 52 : 44,
            borderWidth: underline ? 0 : 1,
            borderBottomWidth: 1,
            borderColor: error
              ? theme.colors['destructive']
              : theme.colors['border'],
            borderRadius: underline ? 0 : theme.radius.md,
            paddingHorizontal: underline ? 0 : theme.spacing(3),
            paddingVertical: multiline ? theme.spacing(2) : 0,
            backgroundColor: underline
              ? 'transparent'
              : theme.colors['background'],
          }}
        >
          {leading}
          <TextInput
            ref={ref}
            accessibilityLabel={
              label ??
              (typeof rest.placeholder === 'string'
                ? rest.placeholder
                : undefined)
            }
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
          <AppText
            variant="caption"
            style={{ color: theme.colors['destructive'] }}
          >
            {error}
          </AppText>
        ) : null}
      </View>
    );
  },
);
