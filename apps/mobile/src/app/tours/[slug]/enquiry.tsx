import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, TextField, useTheme } from '@tourism/mobile-ui';
import { submitEnquiry, validateEnquiry, type EnquiryFieldErrors } from '../../../lib/enquiry';
import { fetchTourDetail } from '../../../lib/tour-detail';

const t = messages.mobile.enquiry;

export default function EnquiryModal() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();

  // Same key as the detail screen -> served from the cache; fetches only on a cold deep link.
  const detailQ = useQuery({
    queryKey: ['tours', 'detail', slug],
    queryFn: () => fetchTourDetail(slug),
    enabled: !!slug,
  });
  const tourId = detailQ.data?.id;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<EnquiryFieldErrors>({});
  const [failure, setFailure] = useState<'generic' | 'rateLimited' | null>(null);
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: submitEnquiry,
    onSuccess: (result) => {
      if (result.ok) {
        setSent(true);
      } else {
        setFailure(result.rateLimited ? 'rateLimited' : 'generic');
      }
    },
    onError: () => setFailure('generic'),
  });

  // Auto-dismiss after the thank-you beat; cleared on unmount (avoids leaked timers).
  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => router.back(), 1500);
    return () => clearTimeout(timer);
  }, [sent]);

  const onSubmit = () => {
    const validation = validateEnquiry({ name, email, phone, message });
    setErrors(validation);
    setFailure(null);
    if (Object.keys(validation).length > 0 || !tourId) return;
    mutation.mutate({ name, email, phone, message, tourId });
  };

  if (sent) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
        >
          <AppText variant="display">✓</AppText>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.success}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={{ gap: theme.spacing(4), paddingVertical: theme.spacing(4) }}>
        <View style={{ gap: theme.spacing(1) }}>
          <AppText variant="title">{t.title}</AppText>
          {detailQ.data ? (
            <AppText variant="caption" muted>
              {detailQ.data.title}
            </AppText>
          ) : null}
        </View>
        <TextField
          label={t.nameLabel}
          value={name}
          onChangeText={setName}
          error={errors.name ? t.errors[errors.name] : undefined}
          autoCorrect={false}
        />
        <TextField
          label={t.emailLabel}
          value={email}
          onChangeText={setEmail}
          error={errors.email ? t.errors[errors.email] : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <TextField
          label={t.phoneLabel}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextField
          label={t.messageLabel}
          value={message}
          onChangeText={setMessage}
          error={errors.message ? t.errors[errors.message] : undefined}
          placeholder={t.messagePlaceholder}
          multiline
        />
        {failure ? (
          <AppText variant="body" style={{ color: theme.colors['destructive'] }}>
            {failure === 'rateLimited' ? t.errors.rateLimited : t.errors.generic}
          </AppText>
        ) : null}
        <Button label={t.submit} onPress={onSubmit} loading={mutation.isPending} disabled={!tourId} />
      </View>
    </Screen>
  );
}
