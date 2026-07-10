import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
};

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
}: SearchFieldProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.wrap}>
      <Ionicons
        name="search"
        size={18}
        color={color(theme, 'muted-foreground')}
        style={styles.icon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={color(theme, 'muted-foreground')}
        style={styles.input}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: theme.minTouch,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: color(theme, 'input'),
      backgroundColor: color(theme, 'card'),
    },
    icon: {
      marginRight: theme.spacing.sm,
    },
    input: {
      flex: 1,
      fontFamily: theme.fonts.sans,
      fontSize: theme.typography.caption,
      color: color(theme, 'foreground'),
      paddingVertical: theme.spacing.sm,
    },
  });
}
