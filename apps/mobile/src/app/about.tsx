import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';

import { messages } from '@tourism/i18n';
import {
  AppText,
  Screen,
  StatGrid,
  cardElevation,
  cardShell,
  color,
  useTheme,
} from '@tourism/mobile-ui';

import { MetricPills } from '../components/about/metric-pills';
import { RemoteImage } from '../components/remote-image';
import {
  fetchAboutMetrics,
  formatAboutMetricValues,
} from '../lib/api/about';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1528127269322-539801943592?w=900&q=70&auto=format&fit=crop';

/** Keep "— built on" on one line when the heading wraps. */
function metricsHeadingText(heading: string): string {
  return heading.replace(' — built on', '\u00a0— built\u00a0on');
}

export default function AboutScreen() {
  const theme = useTheme();
  const copy = messages.about;
  const [metricValues, setMetricValues] = useState<[string, string, string, string]>([
    '0',
    '0',
    '0',
    '—',
  ]);

  useEffect(() => {
    void fetchAboutMetrics().then((m) => setMetricValues(formatAboutMetricValues(m)));
  }, []);

  const styles = createStyles(theme);

  return (
    <>
      <Stack.Screen options={{ title: messages.nav.about, headerShown: true }} />
      <Screen largeTitle={false}>
        <View style={styles.heroIntro}>
          <AppText variant="title" serif style={styles.centeredText}>
            {copy.hero.heading}
          </AppText>
          <AppText variant="bodyLarge" muted style={styles.centeredText}>
            {copy.hero.body}
          </AppText>
        </View>

        <View style={styles.heroCard}>
          <RemoteImage uri={HERO_IMAGE} style={styles.heroImageFrame} />
        </View>

        <View style={[styles.section, styles.sectionCentered]}>
          <AppText variant="title" serif style={styles.centeredText}>
            {copy.story.heading}
          </AppText>
          <AppText variant="bodyLarge" muted style={styles.centeredText}>
            {copy.story.subtitle}
          </AppText>
        </View>

        {copy.story.milestones.map((m) => (
          <View key={m.year} style={styles.milestone}>
            <RemoteImage
              uri={m.image}
              style={styles.milestoneImageFrame}
              accessibilityLabel={m.title}
            />
            <View style={styles.milestoneBody}>
              <View style={styles.yearPill}>
                <AppText variant="body" style={styles.yearText}>
                  {m.year}
                </AppText>
              </View>
              <AppText variant="subhead">{m.title}</AppText>
              <AppText variant="body" muted>
                {m.description}
              </AppText>
            </View>
          </View>
        ))}

        <View style={styles.metricsSection}>
          <AppText variant="title" serif style={[styles.centeredText, styles.metricsHeading]}>
            {metricsHeadingText(copy.metrics.heading)}
          </AppText>
          <MetricPills pills={copy.metrics.pills} />
          <StatGrid labels={copy.metrics.labels} values={metricValues} />
        </View>

        <View style={styles.section}>
          <View style={styles.teamEyebrow}>
            <AppText variant="caption" style={styles.teamEyebrowText}>
              {copy.team.eyebrow}
            </AppText>
          </View>
          <AppText variant="title" serif>
            {copy.team.heading}
          </AppText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.teamList}
        >
          {copy.team.members.map((item) => (
            <View key={item.name} style={styles.teamCard}>
              <View style={styles.avatar}>
                <AppText variant="headline" style={styles.avatarText}>
                  {item.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)}
                </AppText>
              </View>
              <AppText variant="body" style={styles.memberName}>
                {item.name}
              </AppText>
              <AppText variant="caption" style={styles.memberRole}>
                {item.role}
              </AppText>
              <AppText variant="bodyLarge" muted style={styles.teamBio}>
                {item.bio}
              </AppText>
            </View>
          ))}
        </ScrollView>
      </Screen>
    </>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    heroIntro: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
      alignItems: 'center',
    },
    centeredText: {
      textAlign: 'center',
    },
    heroCard: {
      ...cardShell(theme),
      padding: 0,
      height: 180,
      marginHorizontal: theme.spacing.md,
      overflow: 'hidden',
    },
    heroImageFrame: {
      width: '100%',
      height: '100%',
    },
    section: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    sectionCentered: {
      alignItems: 'center',
    },
    milestone: {
      ...cardShell(theme),
      padding: 0,
      overflow: 'hidden',
    },
    milestoneImageFrame: {
      width: '100%',
      aspectRatio: 3 / 2,
    },
    milestoneBody: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    yearPill: {
      alignSelf: 'flex-start',
      backgroundColor: color(theme, 'primary'),
      borderRadius: 999,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    yearText: {
      color: color(theme, 'primary-foreground'),
      fontFamily: theme.fonts.heading,
    },
    metricsSection: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.md,
      alignItems: 'center',
    },
    metricsHeading: {
      width: '100%',
      fontSize: 24,
      lineHeight: 32,
    },
    teamEyebrow: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.sm,
      backgroundColor: color(theme, 'muted'),
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    teamEyebrowText: {
      color: color(theme, 'foreground'),
      fontFamily: theme.fonts.sansMedium,
    },
    teamList: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    teamCard: {
      width: 280,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: color(theme, 'card'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      gap: theme.spacing.sm,
      marginRight: theme.spacing.sm,
      ...cardElevation(theme),
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'primary'),
      marginBottom: theme.spacing.xs,
    },
    avatarText: {
      color: color(theme, 'primary-foreground'),
      fontFamily: theme.fonts.headingSemibold,
    },
    memberName: {
      fontFamily: theme.fonts.sansSemibold,
    },
    memberRole: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansMedium,
    },
    teamBio: {
      lineHeight: 26,
    },
  });
}
