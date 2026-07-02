import React, { useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { theme } from '../../lib/theme';

const OTP_LENGTH = 6;

interface OtpInputProps {
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export function OtpInput({ onComplete, disabled }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const char = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...values];
    next[index] = char;
    setValues(next);

    if (char && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    const code = next.join('');
    if (code.length === OTP_LENGTH && !next.includes('')) {
      onComplete(code);
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !values[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (text: string, index: number) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    if (digits.length === OTP_LENGTH) {
      const next = digits.split('');
      setValues(next);
      inputs.current[OTP_LENGTH - 1]?.focus();
      onComplete(digits);
    } else {
      handleChange(text, index);
    }
  };

  return (
    <View style={styles.row}>
      {values.map((val, i) => (
        <TextInput
          key={i}
          ref={(r) => { inputs.current[i] = r; }}
          style={[styles.cell, val ? styles.cellFilled : undefined]}
          value={val}
          onChangeText={(t) => {
            if (t.length > 1) {
              handlePaste(t, i);
            } else {
              handleChange(t, i);
            }
          }}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          editable={!disabled}
          autoFocus={i === 0}
          textContentType="oneTimeCode"
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    marginVertical: theme.spacing.lg,
  },
  cell: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    textAlign: 'center',
    fontSize: theme.font.xl,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceInput,
  },
  cellFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
});
