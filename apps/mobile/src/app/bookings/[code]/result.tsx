import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Badge,
  Button,
  GlowBadge,
  Screen,
  Spinner,
  useTheme,
} from '@tourism/mobile-ui';
import { FactRow } from '../../../components/fact-row';
import {
  captureBooking,
  fetchBooking,
  startCheckout,
  type BookingVm,
} from '../../../lib/booking';
import { hapticSuccess } from '../../../lib/haptics';
import { formatMoney } from '../../../lib/money';

const ts = messages.booking.success;
const td = messages.booking.detail;
const tm = messages.mobile.booking;

// 'closed' = terminal non-payable statuses (CANCELLED / REFUNDED / …) — never
// offer Pay now on those.
type Phase =
  | 'paying'
  | 'verifying'
  | 'paid'
  | 'pending'
  | 'closed'
  | 'notFound'
  | 'error';

export default function BookingResultScreen() {
  const { code, checkoutUrl } = useLocalSearchParams<{
    code: string;
    checkoutUrl?: string;
  }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('paying');
  const [booking, setBooking] = useState<BookingVm | null>(null);
  // Pay-now can mint a fresh checkout session — always reopen the LATEST url,
  // never the (possibly superseded) route param.
  const [currentUrl, setCurrentUrl] = useState(checkoutUrl ?? null);
  const started = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

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
      if (vm.status === 'PAID') {
        // Seats just sold — stale departure/detail caches would show them free.
        queryClient.invalidateQueries({ queryKey: ['departures'] });
        queryClient.invalidateQueries({ queryKey: ['tours'] });
        hapticSuccess();
        setPhase('paid');
      } else if (vm.status === 'PENDING') {
        setPhase('pending');
      } else {
        setPhase('closed');
      }
    } catch {
      setPhase('error');
    }
  }, [code, queryClient]);

  const openCheckout = useCallback(
    async (url: string) => {
      setCurrentUrl(url);
      setPhase('paying');
      const result = await WebBrowser.openBrowserAsync(url);
      // iOS resolves when the browser closes; Android resolves IMMEDIATELY with
      // { type: 'opened' } — there the AppState listener below verifies when
      // the user returns to the app.
      if (result.type !== 'opened') await verify();
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

  // Android return path: the custom tab backgrounds the app; coming back to
  // 'active' while we're still in 'paying' means the user left the checkout.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && phaseRef.current === 'paying') void verify();
    });
    return () => sub.remove();
  }, [verify]);

  return (
    <Screen>
      <View
        style={{ gap: theme.spacing(4), paddingVertical: theme.spacing(6) }}
      >
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
            {phase === 'paying' && currentUrl ? (
              <Button
                variant="outline"
                label={tm.openCheckout}
                onPress={() => void openCheckout(currentUrl)}
              />
            ) : null}
          </View>
        ) : null}

        {phase === 'paid' && booking ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{ gap: theme.spacing(4) }}
          >
            <View style={{ alignItems: 'center', gap: theme.spacing(3) }}>
              {/* P5.6 confirmation hero: brass glow halo (Navel Screen-39). */}
              <Animated.View entering={ZoomIn.springify().damping(12)}>
                <GlowBadge tone="success">
                  <Ionicons
                    name="checkmark"
                    size={48}
                    color={theme.colors['primary']}
                  />
                </GlowBadge>
              </Animated.View>
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
                borderRadius: theme.radius.lg,
                borderCurve: 'continuous',
                backgroundColor: theme.colors['secondary'],
                padding: theme.spacing(4),
              }}
            >
              <FactRow label={ts.refLabel} value={booking.code} />
              <FactRow label={ts.tourLabel} value={booking.tourTitle} />
              <FactRow
                label={ts.departureLabel}
                value={booking.departureLabel}
              />
              <FactRow label={ts.travellersLabel} value={booking.party} />
              <FactRow
                label={ts.totalLabel}
                value={formatMoney(booking.currency, booking.totalAmount)}
              />
            </View>
            <AppText variant="caption" muted style={{ textAlign: 'center' }}>
              {ts.emailNote}
            </AppText>
            <Button
              label={tm.viewBooking}
              onPress={() => router.replace(`/bookings/${booking.code}`)}
            />
            <Button
              variant="outline"
              label={tm.browseTours}
              onPress={() => router.replace('/')}
            />
          </Animated.View>
        ) : null}

        {phase === 'pending' && booking ? (
          <View style={{ gap: theme.spacing(4) }}>
            <View style={{ alignItems: 'center', gap: theme.spacing(3) }}>
              <GlowBadge tone="neutral">
                <Ionicons
                  name="time-outline"
                  size={44}
                  color={theme.colors['warning']}
                />
              </GlowBadge>
              <AppText variant="display" style={{ textAlign: 'center' }}>
                {tm.stillPendingTitle}
              </AppText>
              <AppText variant="body" muted style={{ textAlign: 'center' }}>
                {tm.stillPendingBody}
              </AppText>
            </View>
            <Button
              testID="verify-again"
              label={tm.verifyAgain}
              onPress={() => void verify()}
            />
            <Button
              variant="outline"
              label={td.payNow}
              onPress={() => void payAgain()}
            />
            <Button
              variant="outline"
              label={tm.viewBooking}
              onPress={() => router.replace(`/bookings/${booking.code}`)}
            />
          </View>
        ) : null}

        {phase === 'closed' && booking ? (
          <View
            style={{
              alignItems: 'center',
              gap: theme.spacing(3),
              paddingVertical: theme.spacing(6),
            }}
          >
            {/* Same template as success — only the glow tone + copy differ. */}
            <GlowBadge tone="error">
              <Ionicons
                name="close"
                size={44}
                color={theme.colors['destructive']}
              />
            </GlowBadge>
            <Badge
              tone={booking.statusMeta.tone}
              label={booking.statusMeta.label}
            />
            <Button
              label={tm.viewBooking}
              onPress={() => router.replace(`/bookings/${booking.code}`)}
            />
            <Button
              variant="outline"
              label={tm.browseTours}
              onPress={() => router.replace('/')}
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
            <Button
              label={tm.browseTours}
              onPress={() => router.replace('/')}
            />
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
            <Button
              testID="verify-again"
              label={tm.verifyAgain}
              onPress={() => void verify()}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
