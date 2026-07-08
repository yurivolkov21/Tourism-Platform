import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, TextField, useTheme } from '@tourism/mobile-ui';
import { useAuth } from '../../../lib/auth-context';
import { useBookingDraft } from '../../../lib/booking-draft';
import { buildCreateBookingPayload } from '../../../lib/booking-form';
import { formatMoney } from '../../../lib/money';
import { partyLine } from '../../../lib/booking';
import { computeBookingTotal } from '../../../lib/price';
import { fetchProfile } from '../../../lib/profile';

const t = messages.booking; // web copy: page/form/errors
const tm = messages.mobile.booking;

/**
 * Booking step 1 of 2 — traveller contact details. The trip (departure +
 * party) was chosen in the DepartureSheet and lives in the BookingDraft;
 * payment happens on the next step. Full payload validation stays with
 * `buildCreateBookingPayload` — here we only surface the contact error.
 */
export default function BookingContactScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const { status } = useAuth();
  const { draft, setContact } = useBookingDraft();

  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: status === 'signedIn',
  });

  const [name, setName] = useState(draft?.name ?? '');
  const [email, setEmail] = useState(draft?.email ?? '');
  const [phone, setPhone] = useState(draft?.phone ?? '');
  const [requests, setRequests] = useState(draft?.requests ?? '');
  const [error, setError] = useState<string | null>(null);

  // Prefill from the profile while the fields are untouched.
  const profile = profileQ.data;
  useEffect(() => {
    if (profile) {
      setName((prev) => (prev === '' ? profile.fullName : prev));
      setEmail((prev) => (prev === '' ? profile.email : prev));
    }
  }, [profile]);

  if (status === 'signedOut') return <Redirect href="/auth/sign-in?reason=booking" />;
  // No trip for THIS tour → the flow wasn't started here (deep link / stale
  // draft) — send the user to the tour to start over.
  if (!draft || draft.tourSlug !== slug) return <Redirect href={`/tours/${slug}`} />;

  const total = computeBookingTotal(draft.unitPrice, draft.adults, draft.children).total;

  const onContinue = () => {
    setError(null);
    // Same validator the payment step uses — a placeholder provider isolates
    // the contact check without duplicating any rules.
    const result = buildCreateBookingPayload({
      tourSlug: draft.tourSlug,
      departureId: draft.departureId,
      numAdults: draft.adults,
      numChildren: draft.children,
      paymentProvider: 'STRIPE',
      contactName: name,
      contactEmail: email,
      contactPhone: phone,
      specialRequests: requests,
    });
    if (!result.ok) {
      setError(messages.booking.errors[result.error]);
      return;
    }
    setContact({ name, email, phone, requests });
    router.push(`/tours/${slug}/book-payment`);
  };

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.colors['background'] }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(4),
          paddingTop: theme.spacing(4),
          paddingBottom: theme.spacing(6),
          gap: theme.spacing(5),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="caption" muted>
          {tm.stepLabel(1, 2)} · {t.page.subtitle}
        </AppText>

        {/* Trip summary from the draft — Edit returns to the tour + sheet. */}
        <View
          style={{
            gap: theme.spacing(2),
            borderWidth: 1,
            borderColor: theme.colors['border'],
            borderRadius: theme.radius.md,
            padding: theme.spacing(4),
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <AppText variant="title">{tm.tripHeading}</AppText>
            <Button
              variant="outline"
              label={tm.editTrip}
              onPress={() => router.back()}
              testID="edit-trip"
            />
          </View>
          <AppText variant="body">{draft.departureLabel}</AppText>
          <AppText variant="caption" muted>
            {partyLine(draft.adults, draft.children)} · {t.page.totalLabel}{' '}
            {formatMoney(draft.currency, total)}
          </AppText>
        </View>

        <View style={{ gap: theme.spacing(3) }}>
          <AppText variant="title">{t.form.travellersHeading}</AppText>
          <AppText variant="caption" muted>
            {t.form.travellersDesc}
          </AppText>
          <TextField
            label={t.form.contactName}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
          />
          <TextField
            label={t.form.contactEmail}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextField
            label={t.form.contactPhone}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
          <TextField
            label={t.form.specialRequests}
            placeholder={t.form.specialRequestsPlaceholder}
            value={requests}
            onChangeText={setRequests}
            multiline
          />
        </View>

        {error ? (
          <AppText
            variant="body"
            accessibilityRole="alert"
            style={{ color: theme.colors['destructive'] }}
          >
            {error}
          </AppText>
        ) : null}

        <Button testID="continue-contact" label={tm.continueCta} onPress={onContinue} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
