import { useEffect, useMemo } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from '@expo-google-fonts/geist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { messages } from '@tourism/i18n';
import { ThemeProvider, useTheme } from '@tourism/mobile-ui';
import { AuthProvider } from '../lib/auth-context';
import { BookingDraftProvider } from '../lib/booking-draft';

const queryClient = new QueryClient({
  // Render free tier cold-starts (~30s): keep retrying a bit before erroring.
  defaultOptions: { queries: { retry: 2, staleTime: 5 * 60_000 } },
});

// Hold the splash until the brand fonts are ready (no system-font flash).
SplashScreen.preventAutoHideAsync();

/**
 * Needs useTheme, so it lives inside ThemeProvider. Three background layers
 * must all be themed or they flash white through transition gaps (found one
 * by one on-device, 2026-07-07):
 *  1. each screen's own wrapper — Stack `contentStyle` (+ Tabs `sceneStyle`
 *     in the tabs layout);
 *  2. the navigator container between screens — react-navigation's theme via
 *     NavigationThemeProvider;
 *  3. the app's root view (Android window background) — expo-system-ui.
 * ios_from_right gives Android the smooth iOS-style parallax push (no-op on
 * iOS, which already has it).
 */
function ThemedStack() {
  const theme = useTheme();

  const navTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors['primary'],
        background: theme.colors['background'],
        card: theme.colors['card'],
        text: theme.colors['foreground'],
        border: theme.colors['border'],
        notification: theme.colors['destructive'],
      },
    };
  }, [theme]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors['background']);
  }, [theme]);

  return (
    <NavigationThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right',
          contentStyle: { backgroundColor: theme.colors['background'] },
          // Brand-styled native header for the screens that opt in below.
          headerStyle: { backgroundColor: theme.colors['background'] },
          headerTintColor: theme.colors['foreground'],
          headerTitleStyle: { fontFamily: theme.fontFamilies.heading, fontSize: 18 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tours/[slug]/index" />
        <Stack.Screen
          name="tours/[slug]/book"
          options={{ headerShown: true, title: messages.booking.page.title }}
        />
        <Stack.Screen
          name="tours/[slug]/book-payment"
          options={{ headerShown: true, title: messages.booking.form.paymentHeading }}
        />
        <Stack.Screen
          name="bookings/index"
          options={{ headerShown: true, title: messages.booking.list.title }}
        />
        <Stack.Screen
          name="bookings/[code]/index"
          options={{ headerShown: true, title: messages.booking.detail.title }}
        />
        <Stack.Screen name="bookings/[code]/result" />
        <Stack.Screen
          name="auth/sign-in"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="auth/sign-up"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="auth/forgot"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null; // splash stays visible

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BookingDraftProvider>
              <BottomSheetModalProvider>
                <StatusBar style="auto" />
                <ThemedStack />
              </BottomSheetModalProvider>
            </BookingDraftProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
