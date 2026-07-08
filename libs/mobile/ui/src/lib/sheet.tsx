import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from './theme-provider';

export interface AppSheetRef {
  present(): void;
  dismiss(): void;
}

export interface AppSheetProps {
  children: ReactNode;
  /** Omit for content-sized sheets (dynamic sizing). */
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
}

/**
 * Themed modal bottom sheet. Wraps @gorhom/bottom-sheet so the dependency
 * (and any future replacement) stays behind ONE component. Requires
 * BottomSheetModalProvider + GestureHandlerRootView at the app root.
 */
export const AppSheet = forwardRef<AppSheetRef, AppSheetProps>(function AppSheet(
  { children, snapPoints, onDismiss },
  ref,
) {
  const theme = useTheme();
  const modalRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: theme.colors['card'],
        borderRadius: theme.radius.lg,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.colors['muted-foreground'] }}
    >
      <BottomSheetView style={{ paddingBottom: theme.spacing(6) }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});

export { BottomSheetScrollView as AppSheetScrollView, BottomSheetTextInput as AppSheetTextInput };
