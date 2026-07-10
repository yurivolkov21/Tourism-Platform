import { StyleSheet, View } from 'react-native';

import type { LegalDoc } from '@tourism/core';

import { AppText } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { color } from '../theme/theme';

type LegalDocumentProps = {
  doc: LegalDoc;
  updatedPrefix?: string;
};

export function LegalDocument({ doc, updatedPrefix = 'Updated' }: LegalDocumentProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const updatedLabel = doc.updated.replace(/^Last updated:\s*/i, '');

  return (
    <View style={styles.root}>
      <AppText variant="caption" muted style={styles.updated}>
        {updatedPrefix}: {updatedLabel}
      </AppText>

      {doc.reviewNote ? (
        <View style={styles.noteBanner}>
          <AppText variant="body" style={styles.noteText}>
            {doc.reviewNote}
          </AppText>
        </View>
      ) : null}

      {doc.intro.map((p) => (
        <AppText key={p.slice(0, 32)} variant="body" muted style={styles.paragraph}>
          {p}
        </AppText>
      ))}

      {doc.sections.map((section, index) => (
        <View
          key={section.heading}
          style={[styles.section, index > 0 ? styles.sectionDivider : null]}
        >
          <View style={styles.headingRow}>
            <View style={styles.sectionBadge}>
              <AppText variant="caption" style={styles.badgeText}>
                {index + 1}
              </AppText>
            </View>
            <AppText variant="headline" style={styles.heading}>
              {section.heading}
            </AppText>
          </View>
          {section.paragraphs?.map((p) => (
            <AppText key={p.slice(0, 32)} variant="body" style={styles.paragraph}>
              {p}
            </AppText>
          ))}
          {section.bullets?.map((b) => (
            <AppText key={b.slice(0, 32)} variant="body" style={styles.bullet}>
              {'\u2022'} {b}
            </AppText>
          ))}
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    updated: {
      marginBottom: theme.spacing.md,
    },
    noteBanner: {
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: color(theme, 'muted'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
    },
    noteText: {
      lineHeight: 22,
    },
    section: {
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    sectionDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color(theme, 'border'),
      marginTop: theme.spacing.sm,
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    sectionBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'muted'),
      marginTop: 2,
    },
    badgeText: {
      color: color(theme, 'primary'),
      fontWeight: '700',
    },
    heading: {
      flex: 1,
    },
    paragraph: {
      lineHeight: 24,
      color: color(theme, 'foreground'),
    },
    bullet: {
      lineHeight: 24,
      paddingLeft: theme.spacing.sm,
      color: color(theme, 'muted-foreground'),
    },
  });
}
