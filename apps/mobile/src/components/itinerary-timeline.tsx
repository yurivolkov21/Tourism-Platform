import { View } from 'react-native';
import { AppText, useTheme } from '@tourism/mobile-ui';
import { parseItineraryLines } from '../lib/itinerary';

/** One day's itinerary body as a vertical timeline — a dot per activity
 * (time or phase label + text), connected by a line, instead of one dense
 * paragraph. Drop-in replacement for `<AppText>{day.body}</AppText>`. */
export function ItineraryDayTimeline({ body }: { body: string }) {
  const theme = useTheme();
  const lines = parseItineraryLines(body);
  return (
    <View>
      {lines.map((line, i) => (
        <View key={i} style={{ flexDirection: 'row' }}>
          <View style={{ width: 20, alignItems: 'center' }}>
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                marginTop: 5,
                backgroundColor: theme.colors['primary'],
              }}
            />
            {i < lines.length - 1 ? (
              <View
                style={{
                  flex: 1,
                  width: 1,
                  marginTop: 2,
                  backgroundColor: theme.colors['border'],
                }}
              />
            ) : null}
          </View>
          <View
            style={{
              flex: 1,
              gap: theme.spacing(1),
              paddingBottom: theme.spacing(3),
            }}
          >
            {line.label ? (
              <AppText
                variant="caption"
                style={{
                  color: theme.colors['primary'],
                  fontFamily: theme.fontFamilies.sansSemiBold,
                }}
              >
                {line.label}
              </AppText>
            ) : null}
            <AppText variant="body">{line.text}</AppText>
          </View>
        </View>
      ))}
    </View>
  );
}
