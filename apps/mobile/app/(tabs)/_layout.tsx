import { Redirect, Tabs } from 'expo-router';
import { theme } from '../../src/lib/theme';
import { useAuth } from '../../src/providers/auth-provider';

export default function TabLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) return null;

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarLabel: 'Home' }}
      />
      <Tabs.Screen
        name="tours"
        options={{ title: 'Tours', tabBarLabel: 'Tours' }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{ title: 'Wishlist', tabBarLabel: 'Wishlist' }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarLabel: 'Account' }}
      />
    </Tabs>
  );
}
