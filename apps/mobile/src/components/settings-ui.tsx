import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, useTheme } from '@tourism/mobile-ui';

/**
 * The shared settings vocabulary — one soft surface per concern, hairline rows,
 * no card chrome. Used by the account settings, app settings and legal screens
 * so the three read as one family (2026-08-20).
 */

/**
 * The group surface. Borderless and shadowless — chrome is what makes a
 * settings screen look busy. Dark raises the group on `card`; light sinks it on
 * `muted` (the deeper cream), which is how the Navel reference separates a
 * group from the page — either way, no border needed.
 */
export function useSurface(): string {
  const theme = useTheme();
  return theme.scheme === 'light'
    ? theme.colors['muted']
    : theme.colors['card'];
}

/** Group label — small, uppercase, muted. The copy inside carries the meaning. */
export function SectionLabel({
  title,
  tone,
}: {
  title: string;
  tone?: 'danger';
}) {
  const theme = useTheme();
  return (
    <AppText
      variant="caption"
      muted={tone !== 'danger'}
      style={{
        paddingHorizontal: theme.spacing(2),
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontFamily: theme.fontFamilies.sansSemiBold,
        ...(tone === 'danger' ? { color: theme.colors['destructive'] } : null),
      }}
    >
      {title}
    </AppText>
  );
}

/**
 * Label + the soft surface holding that group's controls.
 *
 * `form` (default) pads the surface for fields and buttons. `rows` gives it no
 * padding at all — `SettingsRow` carries its own, so a list of rows reads as a
 * list (hairline to hairline) instead of items floating in a padded box.
 * `title` is optional: on a single-group screen the header already names it.
 */
export function Section({
  title,
  tone,
  variant = 'form',
  children,
}: {
  title?: string;
  tone?: 'danger';
  variant?: 'form' | 'rows';
  children: ReactNode;
}) {
  const theme = useTheme();
  const surface = useSurface();
  const rows = variant === 'rows';
  return (
    <View style={{ gap: theme.spacing(2) }}>
      {title ? <SectionLabel title={title} tone={tone} /> : null}
      <View
        style={{
          backgroundColor: surface,
          borderRadius: theme.radius.xl,
          borderCurve: 'continuous',
          overflow: 'hidden',
          padding: rows ? 0 : theme.spacing(5),
          gap: rows ? 0 : theme.spacing(5),
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Hairline between rows. `inset` starts it under the label rather than at the
 * card edge (row padding + icon + gap), so the icon column reads as a column.
 */
export function RowDivider({ inset }: { inset?: boolean } = {}) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 1,
        marginLeft: inset ? theme.spacing(5) + 18 + theme.spacing(3) : 0,
        backgroundColor: theme.colors['border'],
      }}
    />
  );
}

/**
 * A tappable row inside a Section: optional leading icon, label, optional
 * second line, trailing chevron. The touch area spans the group's padding.
 */
export function SettingsRow({
  label,
  description,
  icon,
  tone,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'danger';
  /**
   * Pass on rows that pick one option out of a set: the trailing chevron
   * becomes a checkmark on the chosen row and nothing on the others (a row
   * that changes state in place doesn't navigate, so a chevron would lie).
   */
  selected?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color =
    tone === 'danger'
      ? theme.colors['destructive']
      : theme.colors['foreground'];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      android_ripple={{ color: theme.colors['muted'] }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        // The row owns its padding (Section `rows` has none), so the whole
        // width is tappable and neighbouring rows meet at the hairline.
        paddingHorizontal: theme.spacing(5),
        paddingVertical: theme.spacing(4),
        minHeight: 56,
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.7 : 1,
      })}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={tone === 'danger' ? color : theme.colors['muted-foreground']}
        />
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" style={{ color }}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" muted>
            {description}
          </AppText>
        ) : null}
      </View>
      {selected === undefined ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={tone === 'danger' ? color : theme.colors['muted-foreground']}
        />
      ) : selected ? (
        <Ionicons name="checkmark" size={18} color={theme.colors['primary']} />
      ) : null}
    </Pressable>
  );
}

/**
 * One shape for every result line across the settings screens — icon + caption,
 * success or failure — instead of differently-styled loose captions.
 */
export function FeedbackLine({
  tone,
  text,
}: {
  tone: 'success' | 'error';
  text: string;
}) {
  const theme = useTheme();
  const color =
    tone === 'success' ? theme.colors['success'] : theme.colors['destructive'];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(2),
      }}
    >
      <Ionicons
        name={tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
        size={16}
        color={color}
      />
      <AppText variant="caption" style={{ flex: 1, color }}>
        {text}
      </AppText>
    </View>
  );
}
