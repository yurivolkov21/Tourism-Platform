import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, Spinner, useTheme } from '@tourism/mobile-ui';
import {
  captureBooking,
  fetchBooking,
  startCheckout,
  type BookingVm,
} from '../../../lib/booking';

const ts = messages.booking.success;
const td = messages.booking.detail;
const tm = messages.mobile.booking;

type Phase = 'paying' | 'verifying' | 'paid' | 'pending' | 'notFound' | 'error';

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

export default function BookingResultScreen() {
  const { code, checkoutUrl } = useLocalSearchParams<{ code: string; checkoutUrl?: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('paying');
  const [booking, setBooking] = useState<BookingVm | null>(null);
  const started = useRef(false);

  const verify = useCallback(async () => {
    setPhase('verifying');
    try {
      let vm = await fetchBooking(code);
      if (vm?.paymentProvider === 'PAYPAL' && vm.status === 'PENDING') {
        try {
          await captureBooking(code);
        } catch {
          // An abandoned/unapproved order legitimately fails capture — the
          // refetch below just shows PENDING then.
        }
        vm = await fetchBooking(code);
      }
      if (!vm) {
        setPhase('notFound');
        return;
      }
      setBooking(vm);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setPhase(vm.status === 'PAID' ? 'paid' : 'pending');
    } catch {
      setPhase('error');
    }
  }, [code, queryClient]);

  const openCheckout = useCallback(
    async (url: string) => {
      setPhase('paying');
      await WebBrowser.openBrowserAsync(url);
      await verify(); // the promise resolves when the user closes the browser
    },
    [verify],
  );

  const payAgain = useCallback(async () => {
    setPhase('verifying');
    try {
      const url = await startCheckout(code);
      await openCheckout(url);
    } catch {
      setPhase('error');
    }
  }, [code, openCheckout]);

  useEffect(() => {
    if (started.current) return; // never re-open the browser on re-render
    started.current = true;
    if (checkoutUrl) void openCheckout(checkoutUrl);
    else void verify();
  }, [checkoutUrl, openCheckout, verify]);

  const dollar = booking?.currency === 'USD' ? '$' : '';

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingVertical: theme.spacing(6) }}>
        {phase === 'paying' || phase === 'verifying' ? (
          <View
            style={{
              alignItems: 'center',
              gap: theme.spacing(3),
              paddingVertical: theme.spacing(8),
            }}
          >
            <Spinner />
            <AppText variant="body" muted style={{ textAlign: 'center' }}>
              {phase === 'paying' ? tm.browserHint : tm.verifying}
            </AppText>
            {phase === 'paying' && checkoutUrl ? (
              <Button
                variant="outline"
                label={tm.openCheckout}
                onPress={() => void openCheckout(checkoutUrl)}
              />
            ) : null}
          </View>
        ) : null}

        {phase === 'paid' && booking ? (
          <View style={{ gap: theme.spacing(4) }}>
            <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
              <Ionicons name="checkmark-circle" size={56} color={theme.colors['success']} />
              <AppText variant="display" style={{ textAlign: 'center' }}>
                {ts.confirmedTitle}
              </AppText>
              <AppText variant="body" muted style={{ textAlign: 'center' }}>
                {ts.confirmedBody}
              </AppText>
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
              <Fact label={ts.refLabel} value={booking.code} />
              <Fact label={ts.tourLabel} value={booking.tourTitle} />
              <Fact label={ts.departureLabel} value={booking.departureLabel} />
              <Fact label={ts.travellersLabel} value={booking.party} />
              <Fact label={ts.totalLabel} value={`${dollar}${booking.totalAmount}`} />
            </View>
            <AppText variant="caption" muted style={{ textAlign: 'center' }}>
              {ts.emailNote}
            </AppText>
            <Button
              label={tm.viewBooking}
              onPress={() => router.replace(`/bookings/${booking.code}`)}
            />
            <Button variant="outline" label={tm.browseTours} onPress={() => router.replace('/')} />
          </View>
        ) : null}

        {phase === 'pending' && booking ? (
          <View style={{ gap: theme.spacing(4) }}>
            <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
              <Ionicons name="time-outline" size={56} color={theme.colors['warning']} />
              <AppText variant="display" style={{ textAlign: 'center' }}>
                {tm.stillPendingTitle}
              </AppText>
              <AppText variant="body" muted style={{ textAlign: 'center' }}>
                {messages.booking.cancel.body}
              </AppText>
            </View>
            <Button testID="verify-again" label={tm.verifyAgain} onPress={() => void verify()} />
            <Button variant="outline" label={td.payNow} onPress={() => void payAgain()} />
            <Button
              variant="outline"
              label={tm.viewBooking}
              onPress={() => router.replace(`/bookings/${booking.code}`)}
            />
          </View>
        ) : null}

        {phase === 'notFound' ? (
          <View
            style={{
              alignItems: 'center',
              gap: theme.spacing(3),
              paddingVertical: theme.spacing(8),
            }}
          >
            <AppText variant="body" style={{ textAlign: 'center' }}>
              {ts.notFound}
            </AppText>
            <Button label={tm.browseTours} onPress={() => router.replace('/')} />
          </View>
        ) : null}

        {phase === 'error' ? (
          <View
            style={{
              alignItems: 'center',
              gap: theme.spacing(3),
              paddingVertical: theme.spacing(8),
            }}
          >
            <AppText variant="body" style={{ textAlign: 'center' }}>
              {tm.resultError}
            </AppText>
            <Button testID="verify-again" label={tm.verifyAgain} onPress={() => void verify()} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
