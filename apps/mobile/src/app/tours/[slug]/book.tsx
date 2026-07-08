import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Button, Screen, Spinner, TextField, useTheme } from '@tourism/mobile-ui';
import { useAuth } from '../../../lib/auth-context';
import {
  bookingErrorMessage,
  createBooking,
  fetchTourDepartures,
  startCheckout,
  toDepartureOptions,
  type DepartureOption,
} from '../../../lib/booking';
import {
  buildCreateBookingPayload,
  type CreateBookingPayload,
  type PaymentProvider,
} from '../../../lib/booking-form';
import { formatMoney } from '../../../lib/money';
import { computeBookingTotal } from '../../../lib/price';
import { fetchProfile } from '../../../lib/profile';
import { fetchTourDetail } from '../../../lib/tour-detail';

const t = messages.booking; // web copy: form/page/errors/box
const tm = messages.mobile.booking;
const td = messages.mobile.tourDetail;

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  testIDPrefix,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  testIDPrefix: string;
}) {
  const theme = useTheme();
  const circle = (disabled: boolean) => ({
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: theme.colors['border'],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: disabled ? 0.4 : 1,
  });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <AppText variant="body">{label}</AppText>
        {hint ? (
          <AppText variant="caption" muted>
            {hint}
          </AppText>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) }}>
        <Pressable
          testID={`${testIDPrefix}-dec`}
          accessibilityRole="button"
          accessibilityLabel={tm.stepperDecrease(label)}
          disabled={value <= min}
          hitSlop={8}
          onPress={() => onChange(value - 1)}
          android_ripple={{ color: theme.colors['muted'], foreground: true }}
          style={({ pressed }) => [
            circle(value <= min),
            process.env.EXPO_OS === 'ios' && pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="remove" size={18} color={theme.colors['foreground']} />
        </Pressable>
        <AppText
          testID={`${testIDPrefix}-count`}
          variant="body"
          style={{ minWidth: 24, textAlign: 'center', fontFamily: theme.fontFamilies.sansSemiBold }}
        >
          {value}
        </AppText>
        <Pressable
          testID={`${testIDPrefix}-inc`}
          accessibilityRole="button"
          accessibilityLabel={tm.stepperIncrease(label)}
          disabled={value >= max}
          hitSlop={8}
          onPress={() => onChange(value + 1)}
          android_ripple={{ color: theme.colors['muted'], foreground: true }}
          style={({ pressed }) => [
            circle(value >= max),
            process.env.EXPO_OS === 'ios' && pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="add" size={18} color={theme.colors['foreground']} />
        </Pressable>
      </View>
    </View>
  );
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="title">{title}</AppText>
      {desc ? (
        <AppText variant="caption" muted>
          {desc}
        </AppText>
      ) : null}
    </View>
  );
}

export default function BookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();

  const tourQ = useQuery({
    queryKey: ['tours', 'detail', slug],
    queryFn: () => fetchTourDetail(slug),
    enabled: !!slug,
  });
  const departuresQ = useQuery({
    queryKey: ['departures', slug],
    queryFn: () => fetchTourDepartures(slug),
    enabled: !!slug,
  });
  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: status === 'signedIn',
  });

  const [departureId, setDepartureId] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requests, setRequests] = useState('');
  const [provider, setProvider] = useState<PaymentProvider>('STRIPE');
  const [formError, setFormError] = useState<string | null>(null);

  const tour = tourQ.data;
  const options = useMemo(
    () => (tour ? toDepartureOptions(departuresQ.data ?? [], tour.basePrice) : []),
    [departuresQ.data, tour],
  );

  // Pre-select the first departure with seats once options land.
  useEffect(() => {
    if (departureId === '' && options.length > 0) {
      const first = options.find((o) => o.seatsLeft > 0);
      if (first) setDepartureId(first.id);
    }
  }, [departureId, options]);

  // Prefill contact from the profile (only while the fields are untouched).
  const profile = profileQ.data;
  useEffect(() => {
    if (profile) {
      setName((prev) => (prev === '' ? profile.fullName : prev));
      setEmail((prev) => (prev === '' ? profile.email : prev));
    }
  }, [profile]);

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
      router.replace(
        url
          ? `/bookings/${code}/result?checkoutUrl=${encodeURIComponent(url)}`
          : `/bookings/${code}/result`,
      );
    },
    onError: (error) => setFormError(bookingErrorMessage(error)),
  });

  if (status === 'signedOut') return <Redirect href="/auth/sign-in?reason=booking" />;

  if (tourQ.isPending || departuresQ.isPending) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </View>
      </Screen>
    );
  }
  if (tourQ.isError) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
        >
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {td.error}
          </AppText>
          <Button label={td.retry} onPress={() => tourQ.refetch()} />
        </View>
      </Screen>
    );
  }
  if (!tour) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
        >
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {td.notFound}
          </AppText>
          <Button label={td.goBack} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const selected = options.find((o) => o.id === departureId);
  const seatsLeft = selected?.seatsLeft ?? 20;
  const unitPrice = selected?.price ?? tour.basePrice;
  const total = computeBookingTotal(unitPrice, adults, children).total;

  const selectDeparture = (option: DepartureOption) => {
    if (option.seatsLeft === 0) return;
    setDepartureId(option.id);
    const nextAdults = Math.max(1, Math.min(adults, option.seatsLeft));
    setAdults(nextAdults);
    setChildren(Math.min(children, Math.max(0, option.seatsLeft - nextAdults)));
  };

  const onSubmit = () => {
    setFormError(null);
    const result = buildCreateBookingPayload({
      tourSlug: slug,
      departureId,
      numAdults: adults,
      numChildren: children,
      paymentProvider: provider,
      contactName: name,
      contactEmail: email,
      contactPhone: phone,
      specialRequests: requests,
    });
    if (!result.ok) {
      setFormError(messages.booking.errors[result.error]);
      return;
    }
    submitM.mutate(result.payload);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors['background'] }}>
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
        {/* Native stack header carries the title; the subtitle anchors context. */}
        <AppText variant="caption" muted>
          {t.page.subtitle}
        </AppText>

        {/* Trip summary */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing(3),
            borderWidth: 1,
            borderColor: theme.colors['border'],
            borderRadius: theme.radius.md,
            padding: theme.spacing(3),
            alignItems: 'center',
          }}
        >
          {tour.gallery[0] ? (
            <Image
              source={{ uri: tour.gallery[0] }}
              style={{ width: 72, height: 56, borderRadius: theme.radius.sm }}
              contentFit="cover"
            />
          ) : null}
          <View style={{ flex: 1, gap: 2 }}>
            <AppText
              variant="body"
              numberOfLines={2}
              style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
            >
              {tour.title}
            </AppText>
            <AppText variant="caption" muted>
              {messages.mobile.home.durationDays(tour.durationDays)} · {td.from}{' '}
              {formatMoney(tour.currency, tour.basePrice)}
            </AppText>
          </View>
        </View>

        {/* Departure picker */}
        <View style={{ gap: theme.spacing(3) }}>
          <SectionTitle title={t.form.datesHeading} desc={t.form.datesDesc} />
          {departuresQ.isError ? (
            <View style={{ gap: theme.spacing(3) }}>
              <AppText variant="body" muted>
                {tm.departuresError}
              </AppText>
              <Button
                variant="outline"
                label={tm.retry}
                onPress={() => departuresQ.refetch()}
              />
            </View>
          ) : options.length === 0 ? (
            <AppText variant="body" muted>
              {t.box.noDepartures}
            </AppText>
          ) : (
            options.map((option) => {
              const isSelected = option.id === departureId;
              const soldOut = option.seatsLeft === 0;
              return (
                <Pressable
                  key={option.id}
                  testID={`departure-${option.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected, disabled: soldOut }}
                  disabled={soldOut}
                  onPress={() => selectDeparture(option)}
                  android_ripple={{ color: theme.colors['muted'], foreground: true }}
                  style={({ pressed }) => ({
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? theme.colors['primary'] : theme.colors['border'],
                    borderRadius: theme.radius.md,
                    overflow: 'hidden',
                    padding: theme.spacing(3),
                    gap: 2,
                    opacity: soldOut
                      ? 0.5
                      : process.env.EXPO_OS === 'ios' && pressed
                        ? 0.85
                        : 1,
                  })}
                >
                  <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
                    {option.label}
                  </AppText>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <AppText variant="caption" muted>
                      {formatMoney(tour.currency, option.price)} {t.page.perAdult}
                    </AppText>
                    {soldOut ? (
                      <Badge tone="muted" label={tm.soldOut} />
                    ) : option.seatsLeft <= 5 ? (
                      <Badge tone="warning" label={td.seatsLeft(option.seatsLeft)} />
                    ) : (
                      <AppText variant="caption" muted>
                        {td.seatsLeft(option.seatsLeft)}
                      </AppText>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Travellers */}
        <View style={{ gap: theme.spacing(3) }}>
          <SectionTitle title={t.form.travellersHeading} desc={t.form.travellersDesc} />
          <Stepper
            label={t.form.adults}
            value={adults}
            min={1}
            max={Math.min(20, Math.max(1, seatsLeft - children))}
            onChange={setAdults}
            testIDPrefix="adults"
          />
          <Stepper
            label={t.form.children}
            hint={t.box.childrenHint}
            value={children}
            min={0}
            max={Math.min(20, Math.max(0, seatsLeft - adults))}
            onChange={setChildren}
            testIDPrefix="children"
          />
        </View>

        {/* Contact */}
        <View style={{ gap: theme.spacing(3) }}>
          <SectionTitle title={t.form.heading} />
          <TextField label={t.form.contactName} value={name} onChangeText={setName} />
          <TextField
            label={t.form.contactEmail}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <TextField
            label={t.form.contactPhone}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextField
            label={t.form.specialRequests}
            placeholder={t.form.specialRequestsPlaceholder}
            value={requests}
            onChangeText={setRequests}
            multiline
          />
        </View>

        {/* Payment method */}
        <View style={{ gap: theme.spacing(3) }}>
          <SectionTitle title={t.form.paymentHeading} desc={t.form.paymentDesc} />
          {(
            [
              { id: 'STRIPE', label: t.form.stripe, hint: t.form.stripeHint, icon: 'card-outline' },
              { id: 'PAYPAL', label: t.form.paypal, hint: t.form.paypalHint, icon: 'logo-paypal' },
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
                android_ripple={{ color: theme.colors['muted'], foreground: true }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing(3),
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? theme.colors['primary'] : theme.colors['border'],
                  borderRadius: theme.radius.md,
                  overflow: 'hidden',
                  padding: theme.spacing(3),
                  opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name={method.icon} size={20} color={theme.colors['foreground']} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
                    {method.label}
                  </AppText>
                  <AppText variant="caption" muted>
                    {method.hint}
                  </AppText>
                </View>
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? theme.colors['primary'] : theme.colors['muted-foreground']}
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
      </ScrollView>

      {/* Sticky total + submit */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing(3),
          paddingHorizontal: theme.spacing(4),
          paddingTop: theme.spacing(3),
          paddingBottom: insets.bottom + theme.spacing(3),
          borderTopWidth: 1,
          borderTopColor: theme.colors['border'],
          backgroundColor: theme.colors['background'],
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <AppText variant="caption" muted>
            {t.page.totalLabel}
          </AppText>
          <AppText
            style={{
              fontFamily: theme.fontFamilies.sansSemiBold,
              fontSize: 18,
              lineHeight: 24,
              color: theme.colors['foreground'],
            }}
          >
            {formatMoney(tour.currency, total)}
          </AppText>
          <AppText variant="caption" muted>
            {t.page.totalNote}
          </AppText>
        </View>
        <Button
          testID="submit"
          label={submitM.isPending ? t.form.submitting : t.form.submit}
          loading={submitM.isPending}
          onPress={onSubmit}
          // No selectable departure (none open, or ALL sold out) → nothing to buy.
          disabled={!selected}
        />
      </View>
    </View>
  );
}
