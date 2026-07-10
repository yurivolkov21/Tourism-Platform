import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, useTheme } from '@tourism/mobile-ui';

const tm = messages.mobile.booking;

/** − / count / + row with disabled bounds (adults/children pickers). */
export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  testIDPrefix,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  testIDPrefix: string;
}) {
  const theme = useTheme();
  const circle = (disabled: boolean) => ({
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: theme.colors['border'],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: disabled ? 0.4 : 1,
  });
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View>
        <AppText variant="body">{label}</AppText>
        {hint ? (
          <AppText variant="caption" muted>
            {hint}
          </AppText>
        ) : null}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(3),
        }}
      >
        <Pressable
          testID={`${testIDPrefix}-dec`}
          accessibilityRole="button"
          accessibilityLabel={tm.stepperDecrease(label)}
          disabled={value <= min}
          hitSlop={8}
          onPress={() => onChange(value - 1)}
          android_ripple={{ color: theme.colors['muted'], foreground: true }}
          style={({ pressed }) => [
            circle(value <= min),
            process.env.EXPO_OS === 'ios' && pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons
            name="remove"
            size={18}
            color={theme.colors['foreground']}
          />
        </Pressable>
        <AppText
          testID={`${testIDPrefix}-count`}
          variant="body"
          style={{
            minWidth: 24,
            textAlign: 'center',
            fontFamily: theme.fontFamilies.sansSemiBold,
          }}
        >
          {value}
        </AppText>
        <Pressable
          testID={`${testIDPrefix}-inc`}
          accessibilityRole="button"
          accessibilityLabel={tm.stepperIncrease(label)}
          disabled={value >= max}
          hitSlop={8}
          onPress={() => onChange(value + 1)}
          android_ripple={{ color: theme.colors['muted'], foreground: true }}
          style={({ pressed }) => [
            circle(value >= max),
            process.env.EXPO_OS === 'ios' && pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="add" size={18} color={theme.colors['foreground']} />
        </Pressable>
      </View>
    </View>
  );
}
