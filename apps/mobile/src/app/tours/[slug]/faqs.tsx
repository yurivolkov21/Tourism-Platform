import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import {
  Accordion,
  AppText,
  Screen,
  Spinner,
  useTheme,
} from '@tourism/mobile-ui';
import { fetchTourDetail } from '../../../lib/tour-detail';

const t = messages.mobile.tourDetail;

/** All FAQs (the detail screen teases the first few + Show all). */
export default function FaqsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  // Same key as the detail screen → served from the cache.
  const detailQ = useQuery({
    queryKey: ['tours', 'detail', slug],
    queryFn: () => fetchTourDetail(slug),
    enabled: !!slug,
  });

  if (detailQ.isPending) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Spinner />
        </View>
      </Screen>
    );
  }

  const faqs = detailQ.data?.faqs ?? [];
  return (
    <Screen>
      <View
        style={{ gap: theme.spacing(2), paddingVertical: theme.spacing(4) }}
      >
        {faqs.map((faq, index) => (
          <Accordion
            key={faq.question}
            title={faq.question}
            initiallyOpen={index === 0}
          >
            <AppText variant="body">{faq.answer}</AppText>
          </Accordion>
        ))}
      </View>
    </Screen>
  );
}
