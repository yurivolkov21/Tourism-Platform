import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../src/lib/theme';

export default function WishlistScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wishlist</Text>
      <Text style={styles.subtitle}>Your saved tours — coming soon</Text>
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
