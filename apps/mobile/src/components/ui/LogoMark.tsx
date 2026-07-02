import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../lib/theme';

interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
}

export function LogoMark({ size = 'md', inverted = false }: LogoMarkProps) {
  const fontSize = size === 'sm' ? 22 : size === 'lg' ? 40 : 30;
  const dotSize = size === 'sm' ? 6 : size === 'lg' ? 10 : 8;
  const color = inverted ? theme.colors.textOnPrimary : theme.colors.primary;

  return (
    <View style={styles.row}>
      <Text style={[styles.wordmark, { fontSize, color }]}>nexora</Text>
      <View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, backgroundColor: theme.colors.primaryLight },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dot: {
    borderRadius: theme.radius.full,
    marginBottom: 5,
  },
});
