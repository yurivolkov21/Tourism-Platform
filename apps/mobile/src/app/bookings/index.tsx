import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Button, Screen, Skeleton, useTheme } from '@tourism/mobile-ui';
import { AuthGate } from '../../components/auth-gate';
import { useAuth } from '../../lib/auth-context';
import { fetchMyBookings, type BookingVm } from '../../lib/booking';
import { formatMoney } from '../../lib/money';

const t = messages.booking.list;
const tm = messages.mobile.booking;
const tp = messages.mobile.authPrompts;

function BookingCard({ booking }: { booking: BookingVm }) {
  const theme = useTheme();
  return (
    <Pressable
      testID={`booking-${booking.code}`}
      accessibilityRole="button"
      accessibilityLabel={booking.tourTitle}
      onPress={() => router.push(`/bookings/${booking.code}`)}
      android_ripple={{ color: theme.colors['muted'], foreground: true }}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: theme.colors['border'],
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        padding: theme.spacing(4),
        gap: theme.spacing(2),
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) }}>
        <AppText
          variant="body"
          numberOfLines={1}
          style={{ flex: 1, fontFamily: theme.fontFamilies.sansSemiBold }}
        >
          {booking.tourTitle}
        </AppText>
        <Badge tone={booking.statusMeta.tone} label={booking.statusMeta.label} />
      </View>
      <AppText variant="caption" muted>
        {t.refLabel}: {booking.code} · {t.bookedOn(booking.bookedOn)}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="caption" muted>
          {t.departureLabel}: {booking.departureLabel}
        </AppText>
        <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
          {formatMoney(booking.currency, booking.totalAmount)}
        </AppText>
      </View>
    </Pressable>
  );
}

export default function BookingsScreen() {
  const theme = useTheme();
  const { status } = useAuth();
  const listQ = useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: fetchMyBookings,
    enabled: status === 'signedIn',
  });

  if (status !== 'signedIn') {
    return (
      <Screen scroll={false}>
        <AuthGate icon="receipt-outline" title={t.title} body={tp.accountGateBody} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingTop: theme.spacing(2), gap: theme.spacing(3) }}>
        <AppText variant="caption" muted>
          {t.subtitle}
        </AppText>
        {listQ.isPending ? (
          <View style={{ gap: theme.spacing(3) }}>
            <Skeleton height={104} />
            <Skeleton height={104} />
            <Skeleton height={104} />
          </View>
        ) : listQ.isError || !listQ.data ? (
          <View
            style={{
              alignItems: 'center',
              gap: theme.spacing(3),
              paddingVertical: theme.spacing(6),
            }}
          >
            <AppText variant="body" style={{ textAlign: 'center' }}>
              {tm.listError}
            </AppText>
            <Button label={tm.retry} onPress={() => listQ.refetch()} />
          </View>
        ) : listQ.data.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              gap: theme.spacing(3),
              paddingVertical: theme.spacing(6),
            }}
          >
            <AppText variant="body" muted style={{ textAlign: 'center' }}>
              {t.empty}
            </AppText>
            <Button label={t.browse} onPress={() => router.push('/explore')} />
          </View>
        ) : (
          <FlatList
            data={listQ.data}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => <BookingCard booking={item} />}
            contentContainerStyle={{ gap: theme.spacing(3), paddingBottom: theme.spacing(6) }}
            showsVerticalScrollIndicator={false}
            refreshing={listQ.isRefetching}
            onRefresh={() => listQ.refetch()}
          />
        )}
      </View>
    </Screen>
  );
}
