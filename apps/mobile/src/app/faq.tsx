import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Stack } from 'expo-router';

import { messages } from '@tourism/i18n';
import {
  Accordion,
  AppText,
  EmptyState,
  PageIntro,
  Screen,
  SearchField,
  color,
  useTheme,
} from '@tourism/mobile-ui';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICONS: IoniconName[] = [
  'card-outline',
  'map-outline',
  'compass-outline',
  'refresh-outline',
  'airplane-outline',
];

export default function FaqScreen() {
  const theme = useTheme();
  const copy = messages.faqPage;
  const [query, setQuery] = useState('');
  const styles = createStyles(theme);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return copy.categories
      .map((category, index) => ({
        category,
        icon: CATEGORY_ICONS[index] ?? 'help-circle-outline',
        items: category.items
          .filter(
            (item) =>
              !q ||
              item.question.toLowerCase().includes(q) ||
              item.answer.toLowerCase().includes(q),
          )
          .map((item) => ({
            id: `${category.title}-${item.question}`,
            title: item.question,
            content: item.answer,
          })),
      }))
      .filter((g) => g.items.length > 0);
  }, [copy.categories, query]);

  const hasResults = groups.length > 0;

  return (
    <>
      <Stack.Screen options={{ title: copy.title, headerShown: true }} />
      <Screen largeTitle={false}>
        <PageIntro>
          <AppText variant="bodyLarge" muted>
            {copy.subtitle}
          </AppText>
        </PageIntro>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={copy.searchPlaceholder}
          accessibilityLabel={copy.searchLabel}
        />

        {!hasResults ? (
          <EmptyState message={copy.noResults} />
        ) : (
          groups.map((group) => (
            <View key={group.category.title} style={styles.group}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIconWrap}>
                  <Ionicons
                    name={group.icon}
                    size={18}
                    color={color(theme, 'primary')}
                  />
                </View>
                <AppText variant="sectionTitle" style={styles.categoryTitle}>
                  {group.category.title}
                </AppText>
              </View>
              <Accordion items={group.items} allowNoneOpen />
            </View>
          ))
        )}
      </Screen>
    </>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    group: {
      marginBottom: theme.spacing.xl,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    categoryIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      backgroundColor: color(theme, 'card'),
    },
    categoryTitle: {
      flex: 1,
    },
  });
}
