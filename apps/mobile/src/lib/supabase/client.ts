import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

function readExtra(key: 'supabaseUrl' | 'supabaseAnonKey', envVar: string): string {
  const fromExtra = Constants.expoConfig?.extra?.[key];
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }
  const fromEnv = process.env[envVar];
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return '';
}

let client: SupabaseClient | undefined;

/** Singleton RN Supabase client — session persisted via AsyncStorage. */
export function getSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  const supabaseUrl = readExtra('supabaseUrl', 'EXPO_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = readExtra('supabaseAnonKey', 'EXPO_PUBLIC_SUPABASE_ANON_KEY');

  client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
