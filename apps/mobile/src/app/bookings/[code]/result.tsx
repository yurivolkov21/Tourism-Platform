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

// 'ready'  = a checkout url is in hand, waiting for the user to tap through.
//            The browser is NEVER opened automatically (user request
//            2026-08-19): a payment hand-off should be a deliberate act, and an
//            auto-launch that races the screen is easy to mistake for a bug.
// 'closed' = terminal non-payable statuses (CANCELLED / REFUNDED / …) — never
//            offer Pay now on those.
type Phase =
  | 'ready'
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
  const [phase, setPhase] = useState<Phase>(
    checkoutUrl ? 'ready' : 'verifying',
  );
  const [booking, setBooking] = useState<BookingVm | null>(null);
  // Pay-now can mint a fresh checkout session — always reopen the LATEST url,
  // never the (possibly superseded) route param.
  const [currentUrl, setCurrentUrl] = useState(checkoutUrl ?? null);
  const [reopening, setReopening] = useState(false);
  const openingRef = useRef(false);
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
      // Entering 'paying' is what arms the AppState return path below — it is
      // only ever reached from here, i.e. from a browser we actually opened.
      setPhase('paying');
      let result: WebBrowser.WebBrowserResult;
      try {
        result = await WebBrowser.openBrowserAsync(url);
      } catch {
        // The launch itself failed (e.g. "Another WebBrowser is already being
        // presented" after a double-tap). The session is still valid, so fall
        // back to the ready screen instead of stranding the user under a
        // spinner that will never resolve.
        setPhase('ready');
        return;
      }
      // iOS resolves when the browser closes; Android resolves IMMEDIATELY with
      // { type: 'opened' } — there the AppState listener below verifies when
      // the user returns to the app.
      if (result.type !== 'opened') await verify();
    },
    [verify],
  );

  /** The button-side wrapper: one launch at a time, and the spinner always clears. */
  const handleOpenCheckout = useCallback(
    async (url: string) => {
      if (openingRef.current) return; // a double-tap must not launch twice
      openingRef.current = true;
      setReopening(true);
      try {
        await openCheckout(url);
      } finally {
        // `finally`, not a trailing statement: a rejected launch used to leave
        // the button spinning forever with no way back.
        openingRef.current = false;
        setReopening(false);
      }
    },
    [openCheckout],
  );

  const payAgain = useCallback(async () => {
    setPhase('verifying');
    try {
      const url = await startCheckout(code);
      // Hand back to the ready screen rather than launching straight into the
      // browser: minting a session is our work, opening checkout is the user's
      // call — same deliberate tap the first attempt goes through.
      setCurrentUrl(url);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, [code]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // With a checkout url we sit in 'ready' and wait for the tap; without one
    // (returning to this screen later) go straight to verifying the status.
    if (!checkoutUrl) void verify();
  }, [checkoutUrl, verify]);

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
        {/* Waiting on the user, not on the network — so no spinner: one here
            would claim work is happening and make the button look redundant. */}
        {phase === 'ready' && currentUrl ? (
          <View style={{ gap: theme.spacing(7), paddingTop: theme.spacing(6) }}>
            <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
              <View style={{ marginBottom: theme.spacing(3) }}>
                <GlowBadge tone="neutral">
                  <Ionicons
                    name="lock-closed-outline"
                    size={40}
                    color={theme.colors['primary']}
                  />
                </GlowBadge>
              </View>
              <AppText variant="display" style={{ textAlign: 'center' }}>
                {tm.readyToPayTitle}
              </AppText>
              <AppText variant="body" muted style={{ textAlign: 'center' }}>
                {tm.readyToPayBody}
              </AppText>
            </View>
            <View style={{ gap: theme.spacing(2) }}>
              <Button
                testID="open-checkout"
                label={reopening ? tm.openingCheckout : tm.openCheckout}
                loading={reopening}
                onPress={() => void handleOpenCheckout(currentUrl)}
              />
              {/* Changing your mind needs a door. Without this the screen is a
                  dead end — the browser used to open on its own, so backing out
                  of it was the way here. */}
              <Button
                variant="outline"
                label={tm.viewBooking}
                onPress={() => router.replace(`/bookings/${code}`)}
              />
            </View>
          </View>
        ) : null}

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
            {/* Android resolves openBrowserAsync immediately, so we sit here
                while the tab is up — offer a way back into it. */}
            {phase === 'paying' && currentUrl ? (
              <Button
                variant="outline"
                label={reopening ? tm.openingCheckout : tm.openCheckout}
                loading={reopening}
                onPress={() => void handleOpenCheckout(currentUrl)}
              />
            ) : null}
          </View>
        ) : null}

        {phase === 'paid' && booking ? (
          // Three beats, not one flat stack: the hero, the receipt, then the
          // actions. A single uniform gap spaced the title, the card, the note
          // and both buttons identically, which read as a list of equals.
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{ gap: theme.spacing(7) }}
          >
            <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
              {/* P5.6 confirmation hero: brass glow halo (Navel Screen-39). */}
              <Animated.View
                entering={ZoomIn.springify().damping(12)}
                style={{ marginBottom: theme.spacing(3) }}
              >
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
                gap: theme.spacing(3),
                borderWidth: 1,
                borderColor: theme.colors['border'],
                borderRadius: theme.radius.lg,
                borderCurve: 'continuous',
                backgroundColor: theme.colors['secondary'],
                padding: theme.spacing(5),
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
            <View style={{ gap: theme.spacing(4) }}>
              <AppText variant="caption" muted style={{ textAlign: 'center' }}>
                {ts.emailNote}
              </AppText>
              {/* The two buttons are one control group — tighter to each other
                  than to anything above them. */}
              <View style={{ gap: theme.spacing(2) }}>
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
            </View>
          </Animated.View>
        ) : null}

        {phase === 'pending' && booking ? (
          <View style={{ gap: theme.spacing(7) }}>
            <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
              <View style={{ marginBottom: theme.spacing(3) }}>
                <GlowBadge tone="neutral">
                  <Ionicons
                    name="time-outline"
                    size={44}
                    color={theme.colors['warning']}
                  />
                </GlowBadge>
              </View>
              <AppText variant="display" style={{ textAlign: 'center' }}>
                {tm.stillPendingTitle}
              </AppText>
              <AppText variant="body" muted style={{ textAlign: 'center' }}>
                {tm.stillPendingBody}
              </AppText>
            </View>
            <View style={{ gap: theme.spacing(2) }}>
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
            {/* Same template as success — glow follows the status semantics
                (REFUNDED keeps its destructive tone; CANCELLED reads neutral,
                per the adversarial review). */}
            <GlowBadge
              tone={
                booking.statusMeta.tone === 'destructive' ? 'error' : 'neutral'
              }
            >
              <Ionicons
                name="close"
                size={44}
                color={
                  booking.statusMeta.tone === 'destructive'
                    ? theme.colors['destructive']
                    : theme.colors['muted-foreground']
                }
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
