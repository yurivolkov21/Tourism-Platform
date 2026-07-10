import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, useTheme } from '@tourism/mobile-ui';
import { useAuth } from '../../../lib/auth-context';
import {
  bookingErrorMessage,
  createBooking,
  partyLine,
  startCheckout,
} from '../../../lib/booking';
import { useBookingDraft } from '../../../lib/booking-draft';
import {
  buildCreateBookingPayload,
  type CreateBookingPayload,
  type PaymentProvider,
} from '../../../lib/booking-form';
import { formatMoney } from '../../../lib/money';
import { computeBookingTotal } from '../../../lib/price';

const t = messages.booking; // web copy: page/form/errors
const tm = messages.mobile.booking;

/**
 * Booking step 2 of 2 — payment method + order summary. Submits through the
 * SAME pipeline as before the stepped flow: buildCreateBookingPayload →
 * createBooking (sync-retry inside) → startCheckout → result screen; a
 * checkout failure still lands on the result screen so a retap can never
 * create a duplicate PENDING booking.
 */
export default function BookingPaymentScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const { status } = useAuth();
  const { draft, reset } = useBookingDraft();
  const [provider, setProvider] = useState<PaymentProvider>('STRIPE');
  const [formError, setFormError] = useState<string | null>(null);

  const submitM = useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const booking = await createBooking(payload);
      try {
        const url = await startCheckout(booking.code);
        return { code: booking.code, url };
      } catch {
        // The PENDING booking exists and holds seats — never leave the user on
        // the form (a retap would create a duplicate). The result screen shows
        // the pending state and offers Pay now against the SAME booking.
        return { code: booking.code, url: null };
      }
    },
    onSuccess: ({ code, url }) => {
      reset(); // the flow is consumed — a back-swipe must not resubmit
      router.replace(
        url
          ? `/bookings/${code}/result?checkoutUrl=${encodeURIComponent(url)}`
          : `/bookings/${code}/result`,
      );
    },
    onError: (error) => setFormError(bookingErrorMessage(error)),
  });

  if (status === 'signedOut')
    return <Redirect href="/auth/sign-in?reason=booking" />;
  // The payment step needs a full draft for THIS tour (trip + contact).
  if (!draft || draft.tourSlug !== slug)
    return <Redirect href={`/tours/${slug}`} />;
  if (!draft.name || !draft.email)
    return <Redirect href={`/tours/${slug}/book`} />;

  const breakdown = computeBookingTotal(
    draft.unitPrice,
    draft.adults,
    draft.children,
  );

  const onSubmit = () => {
    if (submitM.isPending) return;
    setFormError(null);
    const result = buildCreateBookingPayload({
      tourSlug: draft.tourSlug,
      departureId: draft.departureId,
      numAdults: draft.adults,
      numChildren: draft.children,
      paymentProvider: provider,
      contactName: draft.name ?? '',
      contactEmail: draft.email ?? '',
      contactPhone: draft.phone,
      specialRequests: draft.requests,
    });
    if (!result.ok) {
      setFormError(messages.booking.errors[result.error]);
      return;
    }
    submitM.mutate(result.payload);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors['background'] }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing(4),
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(6),
        gap: theme.spacing(5),
      }}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="caption" muted>
        {tm.stepLabel(2, 2)} · {t.form.paymentDesc}
      </AppText>

      {/* Order summary */}
      <View
        style={{
          gap: theme.spacing(2),
          borderWidth: 1,
          borderColor: theme.colors['border'],
          borderRadius: theme.radius.md,
          padding: theme.spacing(4),
        }}
      >
        <AppText variant="title">{t.page.summaryHeading}</AppText>
        <AppText variant="body">{draft.departureLabel}</AppText>
        <AppText variant="caption" muted>
          {partyLine(draft.adults, draft.children)}
        </AppText>
        {breakdown.lines.map((line) => (
          <View
            key={line.kind}
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <AppText variant="caption" muted>
              {line.kind === 'adult'
                ? `${t.page.adultsLine(line.quantity)} × ${formatMoney(draft.currency, line.unitPrice)}`
                : `${t.page.childrenLine(line.quantity)} × ${formatMoney(draft.currency, line.unitPrice)}`}
            </AppText>
            <AppText variant="caption">
              {formatMoney(draft.currency, line.subtotal)}
            </AppText>
          </View>
        ))}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderTopColor: theme.colors['border'],
            paddingTop: theme.spacing(2),
          }}
        >
          <AppText
            variant="body"
            style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
          >
            {t.page.totalLabel}
          </AppText>
          <AppText
            variant="body"
            style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
          >
            {formatMoney(draft.currency, breakdown.total)}
          </AppText>
        </View>
        <AppText variant="caption" muted>
          {t.page.totalNote}
        </AppText>
      </View>

      {/* Payment method */}
      <View style={{ gap: theme.spacing(3) }}>
        <AppText variant="title">{t.form.paymentHeading}</AppText>
        {(
          [
            {
              id: 'STRIPE',
              label: t.form.stripe,
              hint: t.form.stripeHint,
              icon: 'card-outline',
            },
            {
              id: 'PAYPAL',
              label: t.form.paypal,
              hint: t.form.paypalHint,
              icon: 'logo-paypal',
            },
          ] as const
        ).map((method) => {
          const isSelected = provider === method.id;
          return (
            <Pressable
              key={method.id}
              testID={`provider-${method.id}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setProvider(method.id)}
              android_ripple={{
                color: theme.colors['muted'],
                foreground: true,
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing(3),
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected
                  ? theme.colors['primary']
                  : theme.colors['border'],
                borderRadius: theme.radius.md,
                overflow: 'hidden',
                padding: theme.spacing(3),
                opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
              })}
            >
              <Ionicons
                name={method.icon}
                size={20}
                color={theme.colors['foreground']}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText
                  variant="body"
                  style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
                >
                  {method.label}
                </AppText>
                <AppText variant="caption" muted>
                  {method.hint}
                </AppText>
              </View>
              <Ionicons
                name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={
                  isSelected
                    ? theme.colors['primary']
                    : theme.colors['muted-foreground']
                }
              />
            </Pressable>
          );
        })}
        <AppText variant="caption" muted>
          {t.form.trustLine}
        </AppText>
      </View>

      {formError ? (
        <AppText
          variant="body"
          accessibilityRole="alert"
          style={{ color: theme.colors['destructive'] }}
        >
          {formError}
        </AppText>
      ) : null}

      <Button
        testID="submit"
        label={submitM.isPending ? t.form.submitting : t.form.submit}
        loading={submitM.isPending}
        onPress={onSubmit}
      />
    </ScrollView>
  );
}
