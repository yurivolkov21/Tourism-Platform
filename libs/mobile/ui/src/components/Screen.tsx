import {

  forwardRef,

  type PropsWithChildren,

  type ReactNode,

  type RefObject,

  useMemo,

  useRef,

} from 'react';

import {

  Keyboard,

  Platform,

  Pressable,

  ScrollView,

  StyleSheet,

  View,

  type ScrollViewProps,

  type StyleProp,

  type ViewStyle,

} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';



import { AppText } from './Text';

import { useKeyboardInsets } from '../hooks/use-keyboard-insets';

import { useTheme } from '../theme/ThemeProvider';

import { useTopSafeInset } from '../theme/safe-area';

import { color as resolveColor } from '../theme/theme';



export type ScreenProps = PropsWithChildren<{

  title?: string;

  subtitle?: string;

  scroll?: boolean;

  largeTitle?: boolean;

  keyboardAware?: boolean;

  contentBottomInset?: number;

  contentStyle?: StyleProp<ViewStyle>;

  contentRef?: RefObject<View | null>;

  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>;

  headerRight?: ReactNode;

}>;



function resolveBottomPadding(

  baseStyles: StyleProp<ViewStyle>,

  contentStyle: StyleProp<ViewStyle> | undefined,

  fallback: number,

): number {

  const flattened = StyleSheet.flatten([baseStyles, contentStyle]);

  const padding = flattened?.paddingBottom;

  return typeof padding === 'number' ? padding : fallback;

}



export const Screen = forwardRef<ScrollView, ScreenProps>(function Screen(

  {

    title,

    subtitle,

    scroll = true,

    largeTitle = true,

    keyboardAware = false,

    contentBottomInset = 0,

    contentStyle,

    contentRef: contentRefProp,

    scrollProps,

    headerRight,

    children,

  },

  ref,

) {

  const theme = useTheme();

  const topInset = useTopSafeInset();

  const { keyboardHeight, isKeyboardVisible } = useKeyboardInsets();

  const internalContentRef = useRef<View>(null);

  const contentRef = contentRefProp ?? internalContentRef;

  const styles = createStyles(theme, topInset, largeTitle);



  const keyboardScrollRoom =

    keyboardAware && isKeyboardVisible && Platform.OS === 'android'

      ? keyboardHeight

      : 0;



  const totalBottomInset = contentBottomInset + keyboardScrollRoom;



  const mergedContentStyle = useMemo(() => {

    if (totalBottomInset <= 0) {

      return [styles.content, contentStyle];

    }

    const basePadding = resolveBottomPadding(

      styles.content,

      contentStyle,

      theme.spacing.xl,

    );

    return [

      styles.content,

      contentStyle,

      { paddingBottom: basePadding + totalBottomInset },

    ];

  }, [contentStyle, styles.content, theme.spacing.xl, totalBottomInset]);



  const mergedRootStyle = useMemo(() => {

    if (totalBottomInset <= 0) {

      return [styles.root, contentStyle];

    }

    const basePadding = resolveBottomPadding(styles.root, contentStyle, 0);

    return [styles.root, contentStyle, { paddingBottom: basePadding + totalBottomInset }];

  }, [contentStyle, styles.root, totalBottomInset]);



  const header =

    title != null ? (

      <View style={styles.header}>

        {headerRight ? (

          <View style={styles.headerRow}>

            <View style={styles.headerTitle}>

              <AppText variant={largeTitle ? 'largeTitle' : 'title'}>{title}</AppText>

            </View>

            <View style={styles.headerRight}>{headerRight}</View>

          </View>

        ) : (

          <AppText variant={largeTitle ? 'largeTitle' : 'title'}>{title}</AppText>

        )}

        {subtitle ? (

          <AppText variant="body" muted style={styles.subtitle}>

            {subtitle}

          </AppText>

        ) : null}

      </View>

    ) : null;



  const body = (

    <>

      {header}

      {children}

    </>

  );



  if (!scroll) {

    return (

      <SafeAreaView edges={['left', 'right']} style={styles.safeRoot}>

        <View style={mergedRootStyle}>{body}</View>

      </SafeAreaView>

    );

  }



  const scrollContent = keyboardAware ? (

    <Pressable

      style={styles.tapDismiss}

      onPress={Keyboard.dismiss}

      accessible={false}

    >

      <View ref={contentRef} collapsable={false}>

        {body}

      </View>

    </Pressable>

  ) : (

    <View ref={contentRef} collapsable={false}>

      {body}

    </View>

  );



  return (

    <SafeAreaView edges={['left', 'right']} style={styles.safeRoot}>

      <ScrollView

        ref={ref}

        style={styles.root}

        contentContainerStyle={mergedContentStyle}

        keyboardShouldPersistTaps="handled"

        automaticallyAdjustKeyboardInsets={keyboardAware && Platform.OS === 'ios'}

        keyboardDismissMode={keyboardAware ? 'on-drag' : scrollProps?.keyboardDismissMode}

        {...scrollProps}

      >

        {scrollContent}

      </ScrollView>

    </SafeAreaView>

  );

});



function createStyles(

  theme: ReturnType<typeof useTheme>,

  topInset: number,

  largeTitle: boolean,

) {

  return StyleSheet.create({

    safeRoot: {

      flex: 1,

      backgroundColor: resolveColor(theme, 'background'),

      paddingTop: topInset,

    },

    root: {

      flex: 1,

      backgroundColor: resolveColor(theme, 'background'),

    },

    content: {

      paddingBottom: theme.spacing.xl,

    },

    tapDismiss: {

      flexGrow: 1,

    },

    header: {

      paddingHorizontal: theme.spacing.md,

      paddingTop: largeTitle ? theme.spacing.lg : theme.spacing.md,

      paddingBottom: largeTitle ? theme.spacing.md : theme.spacing.sm,

      gap: theme.spacing.xs,

    },

    headerRow: {

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: theme.spacing.sm,

    },

    headerTitle: {

      flex: 1,

    },

    headerRight: {

      marginTop: largeTitle ? theme.spacing.xs : 0,

    },

    subtitle: {

      marginTop: theme.spacing.xs,

    },

  });

}


