import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import {
  AppSheet,
  AppText,
  Badge,
  Button,
  useTheme,
  type AppSheetRef,
} from '@tourism/mobile-ui';
import {
  fetchTourDepartures,
  toDepartureOptions,
  type DepartureOption,
} from '../lib/booking';
import { useBookingDraft } from '../lib/booking-draft';
import { formatMoney } from '../lib/money';
import { computeBookingTotal } from '../lib/price';
import { Stepper } from './stepper';

const t = messages.booking; // web copy: form/page/box
const tm = messages.mobile.booking;
const td = messages.mobile.tourDetail;

export interface DepartureSheetRef {
  open(): void;
}

/**
 * Step 0 of the booking flow: pick a departure + travellers, see the live
 * total, Continue seeds the BookingDraft and pushes the contact step.
 */
export const DepartureSheet = forwardRef<
  DepartureSheetRef,
  { slug: string; basePrice: number; currency: string }
>(function DepartureSheet({ slug, basePrice, currency }, ref) {
  const theme = useTheme();
  const sheetRef = useRef<AppSheetRef>(null);
  const { draft, setTrip } = useBookingDraft();

  const departuresQ = useQuery({
    queryKey: ['departures', slug],
    queryFn: () => fetchTourDepartures(slug),
    enabled: !!slug,
  });
  const options = useMemo(
    () => toDepartureOptions(departuresQ.data ?? [], basePrice),
    [departuresQ.data, basePrice],
  );

  const [departureId, setDepartureId] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  useImperativeHandle(ref, () => ({
    open: () => {
      if (draft && draft.tourSlug === slug) {
        // "Edit trip" from the contact step: seed the previous selection.
        setDepartureId(draft.departureId);
        setAdults(draft.adults);
        setChildren(draft.children);
      } else {
        // Fresh trip.
        setDepartureId('');
        setAdults(1);
        setChildren(0);
      }
      sheetRef.current?.present();
    },
  }));

  const selected = options.find((o) => o.id === departureId);
  const seatsLeft = selected?.seatsLeft ?? 20;
  const unitPrice = selected?.price ?? basePrice;
  const total = computeBookingTotal(unitPrice, adults, children).total;

  const selectDeparture = (option: DepartureOption) => {
    if (option.seatsLeft === 0) return;
    setDepartureId(option.id);
    const nextAdults = Math.max(1, Math.min(adults, option.seatsLeft));
    setAdults(nextAdults);
    setChildren(Math.min(children, Math.max(0, option.seatsLeft - nextAdults)));
  };

  const onContinue = () => {
    if (!selected) return; // CTA is disabled, but never trust a race
    // Departures can refetch between selection and Continue (retry, cache
    // invalidation) — re-clamp against the CURRENT seats instead of seeding
    // an over-capacity party that only fails at the final payment submit.
    if (selected.seatsLeft === 0 || adults + children > selected.seatsLeft) {
      const nextAdults = Math.max(1, Math.min(adults, selected.seatsLeft));
      setAdults(nextAdults);
      setChildren(
        Math.min(children, Math.max(0, selected.seatsLeft - nextAdults)),
      );
      if (selected.seatsLeft === 0) setDepartureId('');
      return; // the user sees the corrected steppers and confirms again
    }
    setTrip({
      tourSlug: slug,
      departureId: selected.id,
      departureLabel: selected.label,
      unitPrice: selected.price,
      currency,
      adults,
      children,
    });
    sheetRef.current?.dismiss();
    router.push(`/tours/${slug}/book`);
  };

  return (
    <AppSheet ref={sheetRef} scrollable>
      <View
        style={{ paddingHorizontal: theme.spacing(4), gap: theme.spacing(4) }}
      >
        <AppText
          variant="title"
          style={{ fontFamily: theme.fontFamilies.headingBold, fontSize: 24 }}
        >
          {t.form.datesHeading}
        </AppText>

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
            {departuresQ.isPending ? '' : t.box.noDepartures}
          </AppText>
        ) : (
          <View style={{ gap: theme.spacing(2) }}>
            {options.map((option) => {
              const isSelected = option.id === departureId;
              const soldOut = option.seatsLeft === 0;
              return (
                <Pressable
                  key={option.id}
                  testID={`departure-${option.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: isSelected,
                    disabled: soldOut,
                  }}
                  disabled={soldOut}
                  onPress={() => selectDeparture(option)}
                  android_ripple={{
                    color: theme.colors['muted'],
                    foreground: true,
                  }}
                  style={({ pressed }) => ({
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected
                      ? theme.colors['primary']
                      : theme.colors['border'],
                    borderRadius: theme.radius.lg,
                    borderCurve: 'continuous',
                    backgroundColor: isSelected
                      ? theme.colors['accent']
                      : theme.colors['secondary'],
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
                  <AppText
                    variant="body"
                    style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
                  >
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
                      {formatMoney(currency, option.price)} {t.page.perAdult}
                    </AppText>
                    {soldOut ? (
                      <Badge tone="muted" label={tm.soldOut} />
                    ) : option.seatsLeft <= 5 ? (
                      <Badge
                        tone="warning"
                        label={td.seatsLeft(option.seatsLeft)}
                      />
                    ) : (
                      <AppText variant="caption" muted>
                        {td.seatsLeft(option.seatsLeft)}
                      </AppText>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

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

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing(3),
          }}
        >
          <View style={{ flexShrink: 1 }}>
            <AppText variant="caption" muted>
              {t.page.totalLabel}
            </AppText>
            <AppText
              style={{
                fontFamily: theme.fontFamilies.sansSemiBold,
                fontSize: 22,
                lineHeight: 28,
                color: theme.colors['foreground'],
              }}
            >
              {formatMoney(currency, total)}
            </AppText>
          </View>
          <Button
            testID="continue-trip"
            label={tm.continueCta}
            onPress={onContinue}
            disabled={!selected}
          />
        </View>
      </View>
    </AppSheet>
  );
});
