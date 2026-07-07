import { TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from './app-text';
import { useTheme } from './theme-provider';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  /** Error copy shown under the field; also colors the border. */
  error?: string;
}

export function TextField({ label, error, multiline, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1) }}>
      {label ? (
        <AppText variant="caption" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors['muted-foreground']}
        multiline={multiline}
        {...rest}
        style={[
          {
            minHeight: multiline ? 100 : 44,
            borderWidth: 1,
            borderColor: error ? theme.colors['destructive'] : theme.colors['border'],
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing(3),
            paddingVertical: multiline ? theme.spacing(2) : 0,
            color: theme.colors['foreground'],
            backgroundColor: theme.colors['background'],
            textAlignVertical: multiline ? 'top' : 'center',
            fontSize: theme.typography.body.fontSize,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" style={{ color: theme.colors['destructive'] }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
