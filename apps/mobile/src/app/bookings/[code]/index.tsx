import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Button, Screen, Spinner, TextField, useTheme } from '@tourism/mobile-ui';
import {
  bookingErrorMessage,
  cancelBooking,
  fetchBooking,
  requestCancellation,
  startCheckout,
  type BookingVm,
} from '../../../lib/booking';

const t = messages.booking.detail;
const tl = messages.booking.list;
const tm = messages.mobile.booking;

function Fact({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing(3) }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="body" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

function Actions({ booking }: { booking: BookingVm }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [banner, setBanner] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['bookings'] });

  const payM = useMutation({
    mutationFn: () => startCheckout(booking.code),
    onSuccess: (url) =>
      router.push(`/bookings/${booking.code}/result?checkoutUrl=${encodeURIComponent(url)}`),
    onError: (error) => setBanner(bookingErrorMessage(error)),
  });
  const cancelM = useMutation({
    mutationFn: () => cancelBooking(booking.code),
    onSuccess: refresh,
    onError: (error) => setBanner(bookingErrorMessage(error)),
  });
  const requestM = useMutation({
    mutationFn: () => requestCancellation(booking.code, reason),
    onSuccess: () => {
      setReasonOpen(false);
      refresh();
    },
    onError: (error) => setBanner(bookingErrorMessage(error)),
  });

  const confirmCancel = () =>
    Alert.alert(t.cancelConfirmTitle, t.cancelConfirmBody, [
      { text: t.keep, style: 'cancel' },
      { text: t.cancelConfirmCta, style: 'destructive', onPress: () => cancelM.mutate() },
    ]);

  const bannerEl = banner ? (
    <AppText variant="body" style={{ color: theme.colors['destructive'] }}>
      {banner}
    </AppText>
  ) : null;

  if (booking.status === 'PENDING') {
    return (
      <View style={{ gap: theme.spacing(3) }}>
        <Button
          testID="pay-now"
          label={payM.isPending ? t.submitting : t.payNow}
          loading={payM.isPending}
          onPress={() => payM.mutate()}
        />
        <Button
          testID="cancel-booking"
          variant="outline"
          label={cancelM.isPending ? t.cancelling : t.cancel}
          loading={cancelM.isPending}
          onPress={confirmCancel}
        />
        {bannerEl}
      </View>
    );
  }

  if (booking.status === 'PAID') {
    if (booking.cancellationStatus === 'REQUESTED') {
      return (
        <AppText variant="body" muted>
          {t.requestPending}
        </AppText>
      );
    }
    const isDenied = booking.cancellationStatus === 'DENIED';
    return (
      <View
        style={{
          gap: theme.spacing(3),
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: theme.colors['border'],
          borderRadius: theme.radius.md,
          padding: theme.spacing(4),
        }}
      >
        <View style={{ gap: 2 }}>
          <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
            {t.requestTitle}
          </AppText>
          <AppText variant="caption" muted>
            {t.requestBody}
          </AppText>
          {isDenied ? (
            <AppText variant="caption" style={{ color: theme.colors['destructive'] }}>
              {t.requestDenied}
            </AppText>
          ) : null}
        </View>
        {reasonOpen ? (
          <View style={{ gap: theme.spacing(3) }}>
            <TextField
              testID="cancel-reason"
              label={t.reasonLabel}
              placeholder={t.reasonPlaceholder}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Button
              testID="send-request"
              label={
                requestM.isPending ? t.submitting : isDenied ? t.requestResubmit : t.submitRequest
              }
              loading={requestM.isPending}
              onPress={() => requestM.mutate()}
            />
          </View>
        ) : (
          <Button
            testID="request-cancellation"
            variant="outline"
            label={isDenied ? t.requestResubmit : t.requestCta}
            onPress={() => setReasonOpen(true)}
          />
        )}
        {bannerEl}
      </View>
    );
  }

  if (booking.refundedAmount != null) {
    const dollar = booking.currency === 'USD' ? '$' : '';
    const amount = `${dollar}${booking.refundedAmount}`;
    return (
      <AppText variant="body" muted>
        {booking.status === 'PARTIALLY_REFUNDED'
          ? t.partiallyRefundedNote(amount)
          : t.refundedNote(amount)}
      </AppText>
    );
  }

  return null; // CANCELLED without a refund — read-only
}

export default function BookingDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const theme = useTheme();
  const bookingQ = useQuery({
    queryKey: ['bookings', code],
    queryFn: () => fetchBooking(code),
    enabled: !!code,
  });

  if (bookingQ.isPending) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </View>
      </Screen>
    );
  }
  if (bookingQ.isError || !bookingQ.data) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
        >
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {bookingQ.isError ? tm.detailError : messages.booking.success.notFound}
          </AppText>
          <Button label={tm.retry} onPress={() => bookingQ.refetch()} />
        </View>
      </Screen>
    );
  }

  const booking = bookingQ.data;
  const dollar = booking.currency === 'USD' ? '$' : '';

  return (
    <Screen scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={{ gap: theme.spacing(5), paddingVertical: theme.spacing(4) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.back}
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors['foreground']} />
          </Pressable>
          <AppText variant="display" style={{ flex: 1 }}>
            {t.title}
          </AppText>
          <Badge tone={booking.statusMeta.tone} label={booking.statusMeta.label} />
        </View>

        <View
          style={{
            gap: theme.spacing(2),
            borderWidth: 1,
            borderColor: theme.colors['border'],
            borderRadius: theme.radius.md,
            padding: theme.spacing(4),
          }}
        >
          <Fact label={tl.refLabel} value={booking.code} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tl.viewTour}
            onPress={() => router.push(`/tours/${booking.tourSlug}`)}
            hitSlop={4}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Fact label={messages.booking.success.tourLabel} value={booking.tourTitle} />
          </Pressable>
          <Fact label={tl.departureLabel} value={booking.departureLabel} />
          <Fact label={tl.travellersLabel} value={booking.party} />
          <Fact label={tl.totalLabel} value={`${dollar}${booking.totalAmount}`} />
          <Fact label={t.paymentLabel} value={booking.paymentProvider} />
          <Fact label={t.contactLabel} value={`${booking.contactName} · ${booking.contactEmail}`} />
          {booking.specialRequests ? (
            <Fact label={t.requestsLabel} value={booking.specialRequests} />
          ) : null}
        </View>

        <Actions booking={booking} />
      </View>
    </Screen>
  );
}
