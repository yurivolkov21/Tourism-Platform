import { StyleSheet, Text, View } from 'react-native';
import { LogoMark } from '../../src/components/ui/LogoMark';
import { theme } from '../../src/lib/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <LogoMark size="lg" />
      <Text style={styles.title}>Discover Vietnam</Text>
      <Text style={styles.subtitle}>Home feed coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: theme.font.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.font.md,
    color: theme.colors.textSecondary,
  },
});
