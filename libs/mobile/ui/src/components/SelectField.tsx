import { useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { useBottomSafeInset } from '../theme/safe-area';
import { color } from '../theme/theme';

type SelectFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
};

export function SelectField({
  label,
  value,
  placeholder,
  options,
  onValueChange,
}: SelectFieldProps) {
  const theme = useTheme();
  const bottomInset = useBottomSafeInset(theme.spacing.lg);
  const [open, setOpen] = useState(false);
  const styles = createStyles(theme, open);

  function selectOption(option: string) {
    onValueChange(option);
    setOpen(false);
  }

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          pressed ? styles.triggerPressed : null,
        ]}
      >
        <AppText
          variant="body"
          style={value ? styles.value : styles.placeholder}
          numberOfLines={1}
        >
          {value || placeholder}
        </AppText>
        <Ionicons
          name="chevron-down"
          size={18}
          color={color(theme, 'muted-foreground')}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.sheet, { paddingBottom: bottomInset }]}>
            <View style={styles.sheetHeader}>
              <AppText variant="headline">{label}</AppText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setOpen(false)}
                hitSlop={8}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={color(theme, 'foreground')}
                />
              </Pressable>
            </View>
            <FlatList
              data={options}
              style={styles.list}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.empty}>
                  <AppText variant="body" muted>
                    No options available
                  </AppText>
                </View>
              }
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    onPress={() => selectOption(item)}
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
                      {item}
                    </AppText>
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={color(theme, 'primary')}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, open: boolean) {
  return StyleSheet.create({
    wrap: { gap: theme.spacing.xs },
    label: { color: color(theme, 'foreground'), fontFamily: theme.fonts.sansMedium },
    trigger: {
      minHeight: theme.minTouch,
      borderWidth: 1,
      borderColor: open ? color(theme, 'primary') : color(theme, 'input'),
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      backgroundColor: color(theme, 'card'),
    },
    triggerPressed: { opacity: 0.88 },
    value: { flex: 1, color: color(theme, 'foreground') },
    placeholder: { flex: 1, color: color(theme, 'muted-foreground') },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    sheet: {
      maxHeight: '70%',
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      backgroundColor: color(theme, 'card'),
      overflow: 'hidden',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      ...Platform.select({
        ios: {
          shadowColor: color(theme, 'foreground'),
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
        },
        android: { elevation: 12 },
        default: {},
      }),
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color(theme, 'border'),
    },
    list: {
      flexGrow: 0,
    },
    empty: {
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    option: {
      minHeight: theme.minTouch,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    optionPressed: {
      backgroundColor: color(theme, 'muted'),
    },
    optionSelected: {
      backgroundColor: color(theme, 'muted'),
    },
    optionTextSelected: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansSemibold,
    },
  });
}
