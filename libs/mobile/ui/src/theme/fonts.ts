/** Post-load family names — must match @expo-google-fonts asset keys loaded in the app shell. */
export const appFonts = {
  sans: {
    regular: 'Geist_400Regular',
    medium: 'Geist_500Medium',
    semibold: 'Geist_600SemiBold',
    bold: 'Geist_700Bold',
  },
  heading: {
    semibold: 'Fraunces_600SemiBold',
    bold: 'Fraunces_700Bold',
    italic: 'Fraunces_400Regular_Italic',
  },
} as const;
