import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { toAuthError } from '../../src/lib/auth/auth-helpers';
import { syncUser } from '../../src/lib/api/sync-user';
import { supabase } from '../../src/lib/supabase/client';
import { theme } from '../../src/lib/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback(url: string) {
      try {
        const parsed = Linking.parse(url);

        // PKCE flow: ?code=xxx (new Supabase default)
        const code = parsed.queryParams?.['code'] as string | undefined;
        if (code) {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (data.session) {
            await syncUser(data.session.access_token);
          }
          router.replace('/(tabs)');
          return;
        }

        // Implicit flow: fragment #access_token=xxx&refresh_token=xxx
        // React Native Linking doesn't expose fragments to supabase-js,
        // so we parse them manually and call setSession directly.
        const fragment = url.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            if (sessionError) throw sessionError;
            if (sessionData.session) {
              await syncUser(sessionData.session.access_token);
              router.replace('/(tabs)');
              return;
            }
          }
        }
        router.replace('/(auth)/login');
      } catch (err) {
        setError(toAuthError(err));
      }
    }

    // Deep link opened the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleCallback(url);
    });

    // Deep link while app is already running
    const sub = Linking.addEventListener('url', ({ url }) =>
      handleCallback(url),
    );
    return () => sub.remove();
  }, [router]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Verification failed</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text
          style={styles.retry}
          onPress={() => router.replace('/(auth)/login')}
        >
          Back to sign in
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.label}>Verifying your email…</Text>
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
  label: {
    fontSize: theme.font.md,
    color: theme.colors.textSecondary,
  },
  errorTitle: {
    fontSize: theme.font.lg,
    fontWeight: '600',
    color: theme.colors.error,
  },
  errorText: {
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  retry: {
    fontSize: theme.font.sm,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: theme.spacing.sm,
  },
});
