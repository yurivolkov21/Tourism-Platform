import { useRef, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { messages } from '@tourism/i18n';
import { AppText, Button, useTheme } from '@tourism/mobile-ui';

const t = messages.mobile.onboarding;

// Bundled (offline-safe): onboarding renders before any network call.
// Photos are the project's own seed media (portrait crops).
const IMAGES = [
  require('../../assets/onboarding/onboarding-1.jpg'),
  require('../../assets/onboarding/onboarding-2.jpg'),
  require('../../assets/onboarding/onboarding-3.jpg'),
];

export type OnboardingIntent = 'signIn' | 'guest';

/**
 * P5.7 S1 — first-launch intro pager (Navel Screens 1-3, guest-first
 * adaptation): 3 full-bleed pages, dash indicator, brass arrow; the LAST
 * page swaps the arrow for "Sign in" / "Explore as guest". Renders as a
 * root takeover BEFORE the router Stack — it must not use expo-router.
 */
export function OnboardingScreen({
  onDone,
}: {
  onDone: (intent: OnboardingIntent) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<(typeof t.pages)[number]>>(null);

  const last = index >= t.pages.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors['background'] }}>
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        data={t.pages}
        keyExtractor={(page) => page.title}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index: i }) => (
          <View style={{ width, flex: 1 }}>
            <Image
              source={IMAGES[i]}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
              accessibilityLabel={item.title}
            />
            {/* ScrimImage recipe, full-screen. */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: theme.colors['media-tint'],
              }}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', theme.colors['scrim']]}
              locations={[0.35, 1]}
              style={{ position: 'absolute', inset: 0 }}
            />
            {/* Copy block — bottom-left, above the controls row. */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: theme.spacing(5),
                right: theme.spacing(5),
                bottom: insets.bottom + 132,
                gap: theme.spacing(3),
              }}
            >
              <AppText
                variant="hero"
                style={{ color: theme.colors['on-media'] }}
              >
                {item.title}
              </AppText>
            </View>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: theme.spacing(5),
                bottom: insets.bottom + theme.spacing(4),
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing(1),
              }}
            >
              <Ionicons
                name="location"
                size={13}
                color={theme.colors['on-media']}
              />
              <AppText
                variant="caption"
                style={{ color: theme.colors['on-media'], opacity: 0.85 }}
              >
                {item.location}
              </AppText>
            </View>
          </View>
        )}
      />

      {/* Skip — top-right, safe-area aware. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.skip}
        testID="onboarding-skip"
        hitSlop={12}
        onPress={() => onDone('guest')}
        style={{
          position: 'absolute',
          top: insets.top + theme.spacing(3),
          right: theme.spacing(5),
          paddingHorizontal: theme.spacing(3),
          paddingVertical: theme.spacing(1),
          borderRadius: 999,
          backgroundColor: theme.colors['overlay'],
        }}
      >
        <AppText variant="caption" style={{ color: theme.colors['on-media'] }}>
          {t.skip}
        </AppText>
      </Pressable>

      {/* Dash page indicator — above the controls, left-aligned (Navel). */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: theme.spacing(5),
          bottom: insets.bottom + 96,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(2),
        }}
      >
        {t.pages.map((page, i) => (
          <View
            key={page.title}
            style={{
              width: i === index ? 36 : 16,
              height: 4,
              borderRadius: 2,
              backgroundColor:
                i === index
                  ? theme.colors['primary']
                  : theme.colors['on-media'],
              opacity: i === index ? 1 : 0.5,
            }}
          />
        ))}
      </View>

      {/* Controls — bottom-right: brass arrow, or the final choice pair. */}
      <View
        style={{
          position: 'absolute',
          right: theme.spacing(5),
          left: last ? theme.spacing(5) : undefined,
          bottom: insets.bottom + 56,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: theme.spacing(2),
        }}
      >
        {last ? (
          <>
            <Button
              variant="outline"
              label={t.guest}
              testID="onboarding-guest"
              onPress={() => onDone('guest')}
              style={{ flex: 1 }}
            />
            <Button
              label={t.signIn}
              testID="onboarding-signin"
              onPress={() => onDone('signIn')}
              style={{ flex: 1 }}
            />
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.next}
            testID="onboarding-next"
            onPress={() => {
              const next = index + 1;
              listRef.current?.scrollToIndex({ index: next, animated: true });
              setIndex(next);
            }}
            android_ripple={{
              color: theme.colors['primary-foreground'],
              foreground: true,
            }}
            style={({ pressed }) => ({
              width: 88,
              height: 56,
              borderRadius: theme.radius.xl,
              borderCurve: 'continuous',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors['primary'],
              opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
            })}
          >
            <Ionicons
              name="arrow-forward"
              size={24}
              color={theme.colors['primary-foreground']}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
