import { StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '../../src/components/ui/AuthButton';
import { theme } from '../../src/lib/theme';
import { useAuth } from '../../src/providers/auth-provider';

export default function AccountScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Signed in as</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <AuthButton
        label="Sign out"
        variant="ghost"
        onPress={signOut}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  label: {
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
  },
  email: {
    fontSize: theme.font.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  button: {
    marginTop: theme.spacing.lg,
    minWidth: 180,
  },
});
