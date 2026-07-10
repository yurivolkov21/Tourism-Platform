import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { messages } from '@tourism/i18n';
import { AppText, color, useTheme } from '@tourism/mobile-ui';

export type EnquiryFormStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'invalid'
  | 'error'
  | 'rateLimited';

export function EnquirySuccess() {
  const theme = useTheme();
  const t = messages.enquiryForm;
  const styles = createSuccessStyles(theme);

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <View style={styles.iconWrap}>
        <Ionicons name="checkmark" size={28} color={color(theme, 'success')} />
      </View>
      <AppText variant="headline" style={styles.title}>
        {t.success}
      </AppText>
      <AppText variant="body" muted style={styles.body}>
        {t.successBody}
      </AppText>
    </View>
  );
}

export function EnquiryStatus({ status }: { status: EnquiryFormStatus }) {
  const theme = useTheme();
  const t = messages.enquiryForm;
  const text =
    status === 'invalid'
      ? t.required
      : status === 'rateLimited'
        ? t.rateLimited
        : status === 'error'
          ? t.errorGeneric
          : null;

  if (!text) return null;

  return (
    <AppText variant="caption" style={{ color: color(theme, 'destructive') }}>
      {text}
    </AppText>
  );
}

function createSuccessStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xl,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'muted'),
    },
    title: {
      textAlign: 'center',
    },
    body: {
      textAlign: 'center',
      maxWidth: 320,
    },
  });
}
