const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '.env'), override: false });
} catch {
  // Expo also inlines EXPO_PUBLIC_* when projectRoot is apps/mobile.
}

const appJson = require('./app.json');
const { PRODUCTION_API_BASE_URL } = require('./api-url');

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? PRODUCTION_API_BASE_URL;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      apiBaseUrl,
      supabaseUrl,
      supabaseAnonKey,
    },
  },
};
