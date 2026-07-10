import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText, color, useTheme } from '@tourism/mobile-ui';

type SortOption<T extends string> = {
  value: T;
  label: string;
};

type ListingSortSectionProps<T extends string> = {
  heading: string;
  options: readonly SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function ListingSortSection<T extends string>({
  heading,
  options,
  value,
  onChange,
}: ListingSortSectionProps<T>) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.group}>
      <AppText variant="caption" style={styles.heading}>
        {heading}
      </AppText>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected ? styles.optionSelected : null,
                pressed ? styles.optionPressed : null,
              ]}
            >
              <AppText
                variant="body"
                style={selected ? styles.optionTextSelected : undefined}
              >
                {option.label}
              </AppText>
              {selected ? (
                <Ionicons name="checkmark" size={20} color={color(theme, 'primary')} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    group: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color(theme, 'border'),
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    heading: {
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontFamily: theme.fonts.sansSemibold,
      color: color(theme, 'foreground'),
    },
    options: {
      gap: 2,
    },
    option: {
      minHeight: theme.minTouch,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    optionSelected: {
      backgroundColor: color(theme, 'muted'),
    },
    optionPressed: {
      opacity: 0.9,
    },
    optionTextSelected: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansSemibold,
    },
  });
}
