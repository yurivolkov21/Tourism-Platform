import { Pressable, View } from 'react-native';
import { AppText } from './app-text';
import { useTheme } from './theme-provider';

const STARS = [1, 2, 3, 4, 5] as const;

export interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  error?: boolean;
}

/** 1-5 star picker. No icon-library dependency (mobile-ui takes icons via
 * props everywhere else) — a Unicode glyph keeps this self-contained. */
export function RatingInput({ value, onChange, error }: RatingInputProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing(1) }}>
      {STARS.map((n) => {
        const selected = n <= value;
        return (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
            accessibilityState={{ selected }}
            hitSlop={8}
            onPress={() => onChange(n)}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText
              style={{
                fontSize: 28,
                lineHeight: 32,
                color: selected
                  ? theme.colors['rating']
                  : error
                    ? theme.colors['destructive']
                    : theme.colors['rating-muted'],
              }}
            >
              {selected ? '★' : '☆'}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
