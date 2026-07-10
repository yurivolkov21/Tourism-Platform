import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  ThemeProvider,
  appFonts,
  color,
  useTheme,
  useThemeColorScheme,
} from '@tourism/mobile-ui';

import { appFontAssets } from '../lib/load-app-fonts';

SplashScreen.preventAutoHideAsync();

function SystemChrome() {
  const theme = useTheme();
  const colorScheme = useThemeColorScheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(color(theme, 'background'));
  }, [theme]);

  return <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />;
}

function Navigation() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitleStyle: {
          fontFamily: appFonts.sans.semibold,
          fontSize: 17,
          color: color(theme, 'foreground'),
        },
        headerTintColor: color(theme, 'primary'),
        headerStyle: {
          backgroundColor: color(theme, 'background'),
        },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="contact"
        options={{ headerShown: true, title: 'Contact', presentation: 'card' }}
      />
      <Stack.Screen
        name="faq"
        options={{ headerShown: true, title: 'FAQs', presentation: 'card' }}
      />
      <Stack.Screen
        name="about"
        options={{ headerShown: true, title: 'About', presentation: 'card' }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          headerShown: true,
          title: 'Privacy',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="terms"
        options={{ headerShown: true, title: 'Terms', presentation: 'card' }}
      />
      <Stack.Screen
        name="trip/[code]"
        options={{ headerShown: true, presentation: 'card' }}
      />
      <Stack.Screen
        name="tour/[slug]"
        options={{ headerShown: true, presentation: 'card' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider preference="light">
          <SystemChrome />
          <Navigation />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
