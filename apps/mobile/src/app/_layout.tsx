import { useEffect, useMemo, useState } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from '@expo-google-fonts/geist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { messages } from '@tourism/i18n';
import { ThemeProvider, useTheme } from '@tourism/mobile-ui';
import {
  OnboardingScreen,
  type OnboardingIntent,
} from '../components/onboarding-screen';
import { AuthProvider } from '../lib/auth-context';
import { BookingDraftProvider } from '../lib/booking-draft';
import { markOnboarded, readOnboarded } from '../lib/onboarding';

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
function ThemedStack({ initialSignIn }: { initialSignIn?: boolean }) {
  const theme = useTheme();

  // "Sign in" chosen on the onboarding's last page: open the auth modal once
  // the Stack has mounted (a tick later — navigating before the navigator is
  // ready throws).
  useEffect(() => {
    if (!initialSignIn) return;
    const id = setTimeout(() => router.push('/auth/sign-in'), 50);
    return () => clearTimeout(id);
  }, [initialSignIn]);

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
          headerTitleStyle: {
            fontFamily: theme.fontFamilies.heading,
            fontSize: 18,
          },
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
          options={{
            headerShown: true,
            title: messages.booking.form.paymentHeading,
          }}
        />
        <Stack.Screen
          name="tours/[slug]/itinerary"
          options={{
            headerShown: true,
            title: messages.mobile.tourDetail.itineraryTitle,
          }}
        />
        <Stack.Screen
          name="tours/[slug]/faqs"
          options={{
            headerShown: true,
            title: messages.mobile.tourDetail.faqsTitle,
          }}
        />
        <Stack.Screen
          name="tours/[slug]/reviews"
          options={{
            headerShown: true,
            title: messages.mobile.tourDetail.reviewsTitle,
          }}
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

  // P5.7 S1: first-launch onboarding gate — resolved from AsyncStorage while
  // the splash is still up, so neither Home nor the pager ever flashes.
  const [onboarding, setOnboarding] = useState<'pending' | 'show' | 'done'>(
    'pending',
  );
  const [signInAfter, setSignInAfter] = useState(false);
  useEffect(() => {
    readOnboarded().then((done) => setOnboarding(done ? 'done' : 'show'));
  }, []);

  const ready = fontsLoaded && onboarding !== 'pending';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null; // splash stays visible

  const finishOnboarding = (intent: OnboardingIntent) => {
    void markOnboarded();
    setSignInAfter(intent === 'signIn');
    setOnboarding('done');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* P5.6 dark-first: the app pins the Dark Heritage scheme (OS setting
          ignored); a light toggle is backlog. StatusBar stays light-on-dark. */}
      <ThemeProvider scheme="dark">
        {onboarding === 'show' ? (
          // Root takeover BEFORE the router Stack — self-contained pager.
          <>
            <StatusBar style="light" />
            <OnboardingScreen onDone={finishOnboarding} />
          </>
        ) : (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <BookingDraftProvider>
                <BottomSheetModalProvider>
                  <StatusBar style="light" />
                  <ThemedStack initialSignIn={signInAfter} />
                </BottomSheetModalProvider>
              </BookingDraftProvider>
            </AuthProvider>
          </QueryClientProvider>
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
