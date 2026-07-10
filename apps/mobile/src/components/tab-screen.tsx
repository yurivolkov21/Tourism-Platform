import { Screen, type ScreenProps } from '@tourism/mobile-ui';

import { useFloatingTabBarInset } from './floating-pill-tab-bar';

export function TabScreen(props: Omit<ScreenProps, 'contentBottomInset'>) {
  const inset = useFloatingTabBarInset();
  return <Screen {...props} contentBottomInset={inset} />;
}
