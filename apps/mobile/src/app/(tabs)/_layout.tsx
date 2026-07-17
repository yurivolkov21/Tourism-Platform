import { Tabs } from 'expo-router';

import { messages } from '@tourism/i18n';
import { color, useTheme } from '@tourism/mobile-ui';

import { FloatingPillTabBar } from '../../components/floating-pill-tab-bar';
import { TabBarIcon } from '../../components/tab-bar-icon';
import { TabBarVisibilityProvider } from '../../components/tab-bar-visibility';
import { splitBookings, useDemoBookings } from '../../lib/demo/demo-bookings';

export default function TabLayout() {
  const theme = useTheme();
  const t = messages.mobile.tabs;
  const background = color(theme, 'background');
  const { bookings } = useDemoBookings();
  const upcomingTripCount = splitBookings(bookings).upcoming.length;

  return (
    <TabBarVisibilityProvider>
      <Tabs
        tabBar={(props) => <FloatingPillTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: color(theme, 'primary'),
          tabBarInactiveTintColor: color(theme, 'muted-foreground'),
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarBackground: () => null,
          sceneStyle: {
            backgroundColor: background,
          },
        }}
      >
        <Tabs.Screen
          name="tours"
          options={{
            title: t.tours,
            tabBarIcon: ({ color: c, size, focused }) => (
              <TabBarIcon
                name={focused ? 'map' : 'map-outline'}
                color={c}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: t.trips,
            tabBarIcon: ({ color: c, size, focused }) => (
              <TabBarIcon
                name={focused ? 'calendar' : 'calendar-outline'}
                color={c}
                size={size}
                badge={upcomingTripCount}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            title: t.saved,
            tabBarIcon: ({ color: c, size, focused }) => (
              <TabBarIcon
                name={focused ? 'heart' : 'heart-outline'}
                color={c}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: t.more,
            tabBarIcon: ({ color: c, size, focused }) => (
              <TabBarIcon
                name={focused ? 'grid' : 'grid-outline'}
                color={c}
                size={size}
              />
            ),
          }}
        />
      </Tabs>
    </TabBarVisibilityProvider>
  );
}
