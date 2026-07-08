import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, Skeleton, useTheme } from '@tourism/mobile-ui';
import { AuthGate } from '../../components/auth-gate';
import { SectionHeading } from '../../components/section-heading';
import { useAuth } from '../../lib/auth-context';
import { hapticSelect } from '../../lib/haptics';
import { fetchSavedTours, useWishlist, type SavedTourVm } from '../../lib/wishlist';

const t = messages.mobile.saved;
const tp = messages.mobile.authPrompts;
const tf = messages.featuredTours;

function SavedRow({ tour, onRemove }: { tour: SavedTourVm; onRemove: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={() => router.push(`/tours/${tour.slug}`)}
      android_ripple={{ color: theme.colors['muted'] }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      <Image
        source={tour.image ? { uri: tour.image } : undefined}
        style={{
          width: 96,
          height: 72,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors['muted'],
        }}
        contentFit="cover"
        accessibilityLabel={tour.title}
      />
      <View style={{ flex: 1, gap: theme.spacing(1) }}>
        <AppText
          numberOfLines={2}
          style={{
            fontFamily: theme.fontFamilies.sansSemiBold,
            fontSize: 15,
            lineHeight: 20,
            minHeight: 40,
            color: theme.colors['foreground'],
          }}
        >
          {tour.title}
        </AppText>
        <AppText variant="caption" muted>
          {tf.from} {tour.currency === 'USD' ? '$' : `${tour.currency} `}
          {tour.basePrice.toLocaleString('en-US')}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.removeLabel}
        testID={`remove-${tour.tourId}`}
        hitSlop={8}
        onPress={onRemove}
        android_ripple={{ color: theme.colors['muted'], borderless: true }}
        style={({ pressed }) => ({
          padding: theme.spacing(2),
          opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="heart-dislike-outline" size={20} color={theme.colors['destructive']} />
      </Pressable>
    </Pressable>
  );
}

export default function SavedScreen() {
  const theme = useTheme();
  const { status } = useAuth();
  const { toggle } = useWishlist();
  const listQ = useQuery({
    queryKey: ['wishlist', 'list'],
    queryFn: fetchSavedTours,
    enabled: status === 'signedIn',
  });

  if (status !== 'signedIn') {
    return (
      <Screen scroll={false}>
        <AuthGate icon="heart-outline" title={tp.savedGateTitle} body={tp.savedGateBody} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={listQ.data ?? []}
        keyExtractor={(item) => item.tourId}
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn.duration(200)}>
            <SavedRow
              tour={item}
              onRemove={() => {
                hapticSelect();
                toggle(item.tourId);
              }}
            />
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing(4) }} />}
        ListHeaderComponent={
          <View style={{ paddingVertical: theme.spacing(4) }}>
            <SectionHeading title={t.title} />
          </View>
        }
        ListFooterComponent={<View style={{ height: theme.spacing(6) }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={listQ.isRefetching}
            onRefresh={() => listQ.refetch()}
            colors={[theme.colors['primary']]}
            tintColor={theme.colors['primary']}
            progressBackgroundColor={theme.colors['card']}
          />
        }
        ListEmptyComponent={
          listQ.isPending ? (
            <View style={{ gap: theme.spacing(3) }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={72} borderRadius={theme.radius.md} />
              ))}
            </View>
          ) : listQ.isError ? (
            <View
              style={{
                alignItems: 'center',
                gap: theme.spacing(3),
                paddingVertical: theme.spacing(6),
              }}
            >
              <AppText variant="body" style={{ textAlign: 'center' }}>
                {t.error}
              </AppText>
              <Button label={t.retry} onPress={() => listQ.refetch()} />
            </View>
          ) : (
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
              <Button label={t.browse} variant="outline" onPress={() => router.push('/explore')} />
            </View>
          )
        }
      />
    </Screen>
  );
}
