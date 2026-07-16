import { Pressable, View } from 'react-native';
import { messages } from '@tourism/i18n';
import { AppText, useTheme } from '@tourism/mobile-ui';

const t = messages.mobile.home;

/**
 * P5.7 S4 — Navel Screen-17 vertical tab rail: rotated region labels spread
 * over the FULL card height; the active one turns brass with a small dash
 * under the word. The dash is the first child of the rotated row — after the
 * -90° turn, row-start points DOWN on screen, so it lands below the label
 * (and it stays mounted transparent so the label never shifts on selection).
 * Short labels ("North") keep the rotation legible; a11y reads the FULL
 * region name and never rotates (accessibilityLabel).
 */
export function RegionTabs({
  regions,
  active,
  onChange,
}: {
  regions: readonly string[];
  active: string;
  onChange: (region: string) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 52,
        alignSelf: 'stretch',
        justifyContent: 'space-evenly',
      }}
    >
      {regions.map((region) => {
        const selected = region === active;
        const label = t.regionShort[region] ?? region;
        return (
          <Pressable
            key={region}
            accessibilityRole="tab"
            accessibilityLabel={region}
            accessibilityState={{ selected }}
            hitSlop={10}
            onPress={() => {
              if (!selected) onChange(region);
            }}
            style={{
              height: 120,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 120,
                transform: [{ rotate: '-90deg' }],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing(2),
              }}
            >
              <View
                style={{
                  width: 3,
                  height: 16,
                  borderRadius: 2,
                  backgroundColor: selected
                    ? theme.colors['primary']
                    : 'transparent',
                }}
              />
              <AppText
                numberOfLines={1}
                style={{
                  fontFamily: selected
                    ? theme.fontFamilies.sansSemiBold
                    : theme.fontFamilies.sans,
                  fontSize: 16,
                  letterSpacing: 0.4,
                  color: selected
                    ? theme.colors['primary']
                    : theme.colors['muted-foreground'],
                }}
              >
                {label}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
