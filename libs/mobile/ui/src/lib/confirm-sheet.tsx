import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { AppSheet, type AppSheetRef } from './sheet';
import { AppText } from './app-text';
import { Button } from './button';
import { useTheme } from './theme-provider';

export interface ConfirmSheetRef {
  present(): void;
  dismiss(): void;
}

export interface ConfirmSheetProps {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** Rendered above the title, e.g. an Ionicons glyph — kept icon-agnostic here. */
  icon?: ReactNode;
}

/**
 * Themed replacement for `Alert.alert` on a destructive action: a bottom sheet
 * with the app's own colours/type instead of the OS's unstyled system dialog,
 * which reads as out of place against the rest of the app's dark theme.
 *
 * Dismisses itself before firing `onConfirm` so the sheet is gone by the time
 * the caller's side effect (navigation, sign-out) runs.
 */
export const ConfirmSheet = forwardRef<ConfirmSheetRef, ConfirmSheetProps>(
  function ConfirmSheet(
    { title, body, confirmLabel, cancelLabel, onConfirm, icon },
    ref,
  ) {
    const theme = useTheme();
    const sheetRef = useRef<AppSheetRef>(null);

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    return (
      <AppSheet ref={sheetRef}>
        <View
          style={{
            paddingHorizontal: theme.spacing(5),
            gap: theme.spacing(4),
            alignItems: 'center',
          }}
        >
          {icon ? (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors['destructive'] + '1a',
              }}
            >
              {icon}
            </View>
          ) : null}

          <View style={{ gap: theme.spacing(1), alignItems: 'center' }}>
            <AppText variant="title" style={{ textAlign: 'center' }}>
              {title}
            </AppText>
            <AppText variant="body" muted style={{ textAlign: 'center' }}>
              {body}
            </AppText>
          </View>

          <View style={{ width: '100%', gap: theme.spacing(2) }}>
            <Button
              label={confirmLabel}
              style={{ backgroundColor: theme.colors['destructive'] }}
              onPress={() => {
                sheetRef.current?.dismiss();
                onConfirm();
              }}
            />
            <Button
              label={cancelLabel}
              variant="outline"
              onPress={() => sheetRef.current?.dismiss()}
            />
          </View>
        </View>
      </AppSheet>
    );
  },
);
