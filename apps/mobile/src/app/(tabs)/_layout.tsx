import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { messages } from '@tourism/i18n';
import { useTheme } from '@tourism/mobile-ui';

const t = messages.mobile.tabs;

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors['primary'],
        tabBarInactiveTintColor: theme.colors['muted-foreground'],
        tabBarLabelStyle: {
          fontFamily: theme.fontFamilies.sansMedium,
          fontSize: 11,
        },
        tabBarStyle: {
          backgroundColor: theme.colors['background'],
          borderTopColor: theme.colors['border'],
        },
        // The tabs' scene wrapper defaults to react-navigation's (white) theme
        // background — it peeks through when a pushed screen slides back off.
        sceneStyle: { backgroundColor: theme.colors['background'] },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.home,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t.explore,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t.trips,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'briefcase' : 'briefcase-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t.saved,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t.account,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
