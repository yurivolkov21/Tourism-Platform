import { View } from 'react-native';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  cancellationDoc,
  messages,
  privacyDoc,
  termsDoc,
  type LegalDoc,
} from '@tourism/i18n';
import { AppText, Screen, useTheme } from '@tourism/mobile-ui';

const tl = messages.mobile.legal;

const DOCS: Record<string, { doc: LegalDoc; icon: string }> = {
  privacy: { doc: privacyDoc, icon: 'shield-checkmark-outline' },
  terms: { doc: termsDoc, icon: 'document-text-outline' },
  cancellation: { doc: cancellationDoc, icon: 'calendar-clear-outline' },
};

/**
 * P5.7 S3 — long-form legal reader (Navel Screen-13): icon tile + display
 * title + "Last updated" line, hairline, then numbered UPPERCASE section
 * headings over airy muted copy. Content = the SAME LegalDoc modules the web
 * renders (single source of truth in @tourism/i18n).
 */
export default function LegalScreen() {
  const theme = useTheme();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const entry = doc ? DOCS[doc] : undefined;

  if (!entry) return <Redirect href="/" />;
  const { doc: legal, icon } = entry;

  return (
    <Screen>
      {/* Native header: back chevron only — the title lives in the content. */}
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <View
        style={{ gap: theme.spacing(5), paddingVertical: theme.spacing(4) }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing(4),
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: theme.radius.lg,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors['secondary'],
            }}
          >
            <Ionicons
              // Record values are typed as string for brevity; the map only
              // holds valid Ionicons names.
              name={icon as keyof typeof Ionicons.glyphMap}
              size={28}
              color={theme.colors['primary']}
            />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="display" style={{ fontSize: 26, lineHeight: 32 }}>
              {legal.title}
            </AppText>
            <AppText variant="caption" muted>
              {tl.updated(legal.updated)}
            </AppText>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: theme.colors['border'] }} />

        {legal.reviewNote ? (
          <View
            style={{
              padding: theme.spacing(3),
              borderRadius: theme.radius.md,
              borderCurve: 'continuous',
              backgroundColor: theme.colors['secondary'],
            }}
          >
            <AppText variant="caption" muted>
              {legal.reviewNote}
            </AppText>
          </View>
        ) : null}

        {legal.intro.map((paragraph) => (
          <AppText key={paragraph} variant="body" muted>
            {paragraph}
          </AppText>
        ))}

        {legal.sections.map((section, i) => (
          <View key={section.heading} style={{ gap: theme.spacing(2) }}>
            <AppText
              variant="body"
              style={{
                fontFamily: theme.fontFamilies.sansSemiBold,
                letterSpacing: 0.4,
              }}
            >
              {i + 1}. {section.heading.toUpperCase()}
            </AppText>
            {section.paragraphs?.map((paragraph) => (
              <AppText key={paragraph} variant="body" muted>
                {paragraph}
              </AppText>
            ))}
            {section.bullets?.map((bullet) => (
              <AppText key={bullet} variant="body" muted>
                {'•'} {bullet}
              </AppText>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
