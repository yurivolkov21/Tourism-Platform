import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@tourism/mobile-ui';

const queryClient = new QueryClient({
  // Render free tier cold-starts (~30s): keep retrying a bit before erroring.
  defaultOptions: { queries: { retry: 2, staleTime: 5 * 60_000 } },
});

/**
 * Needs useTheme, so it lives inside ThemeProvider. The themed contentStyle
 * keeps the gap behind transitioning screens on-brand (the native-stack
 * default is white and flashes during pushes); ios_from_right gives Android
 * the smooth iOS-style parallax push (no-op on iOS, which already has it).
 */
function ThemedStack() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'ios_from_right',
        contentStyle: { backgroundColor: theme.colors['background'] },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="tours/[slug]/index" />
      <Stack.Screen
        name="tours/[slug]/enquiry"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <ThemedStack />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
