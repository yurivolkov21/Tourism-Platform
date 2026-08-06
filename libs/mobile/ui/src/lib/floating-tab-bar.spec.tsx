import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  FloatingTabBar,
  TAB_BAR_TILE,
  type FloatingTabBarProps,
} from './floating-tab-bar';
import { ThemeProvider } from './theme-provider';

// safe-area-context is stubbed in ../test-setup.ts (insets = 0).

function makeProps(
  navigate: jest.Mock,
  emit: jest.Mock = jest.fn(() => ({ defaultPrevented: false })),
): FloatingTabBarProps {
  const routes = [
    { key: 'index-1', name: 'index' },
    { key: 'explore-1', name: 'explore' },
  ];
  return {
    state: { index: 0, routes },
    descriptors: {
      'index-1': {
        options: {
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color }}>H</Text>,
        },
      },
      'explore-1': {
        options: {
          title: 'Explore',
          tabBarIcon: ({ color }) => <Text style={{ color }}>E</Text>,
        },
      },
    },
    navigation: { navigate, emit },
  };
}

test('renders tabs, marks the active one selected, navigates on press', () => {
  const navigate = jest.fn();
  render(
    <ThemeProvider scheme="dark">
      <FloatingTabBar {...makeProps(navigate)} />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText('Home').props.accessibilityState.selected).toBe(
    true,
  );
  expect(
    screen.getByLabelText('Explore').props.accessibilityState.selected,
  ).toBe(false);

  fireEvent.press(screen.getByLabelText('Explore'));
  expect(navigate).toHaveBeenCalledWith('explore');
});

test('renders the bottom fade layer behind the icons', () => {
  render(
    <ThemeProvider scheme="dark">
      <FloatingTabBar {...makeProps(jest.fn())} />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('tabbar-fade')).toBeOnTheScreen();
});

test('every tab tap target is the same fixed size (the brass tile is a separate sliding element)', () => {
  render(
    <ThemeProvider scheme="dark">
      <FloatingTabBar {...makeProps(jest.fn())} />
    </ThemeProvider>,
  );
  const home = StyleSheet.flatten(screen.getByLabelText('Home').props.style);
  const explore = StyleSheet.flatten(
    screen.getByLabelText('Explore').props.style,
  );
  expect(home.width).toBe(TAB_BAR_TILE);
  expect(explore.width).toBe(TAB_BAR_TILE);
});

test('the sliding indicator places itself at the focused tab once its position is measured', () => {
  render(
    <ThemeProvider scheme="dark">
      <FloatingTabBar {...makeProps(jest.fn())} />
    </ThemeProvider>,
  );
  fireEvent(screen.getByLabelText('Home'), 'layout', {
    nativeEvent: {
      layout: { x: 12, y: 0, width: TAB_BAR_TILE, height: TAB_BAR_TILE },
    },
  });
  const indicator = StyleSheet.flatten(
    screen.getByTestId('tab-indicator').props.style,
  );
  expect(indicator.transform).toEqual([{ translateX: 12 }]);
  expect(indicator.opacity).toBe(1);
});

test('the focused icon is full-opacity, the inactive icon is dimmed', () => {
  render(
    <ThemeProvider scheme="dark">
      <FloatingTabBar {...makeProps(jest.fn())} />
    </ThemeProvider>,
  );
  expect(
    StyleSheet.flatten(screen.getByTestId('tab-icon-index').props.style)
      .opacity,
  ).toBe(1);
  expect(
    StyleSheet.flatten(screen.getByTestId('tab-icon-explore').props.style)
      .opacity,
  ).toBe(0.75);
});

test('pressing the already-active tab does not navigate', () => {
  const navigate = jest.fn();
  render(
    <ThemeProvider scheme="dark">
      <FloatingTabBar {...makeProps(navigate)} />
    </ThemeProvider>,
  );
  fireEvent.press(screen.getByLabelText('Home'));
  expect(navigate).not.toHaveBeenCalled();
});

test('pressing the already-active tab still emits tabPress (screens use it for scroll-to-top)', () => {
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  render(
    <ThemeProvider scheme="dark">
      <FloatingTabBar {...makeProps(jest.fn(), emit)} />
    </ThemeProvider>,
  );
  fireEvent.press(screen.getByLabelText('Home'));
  expect(emit).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'tabPress', target: 'index-1' }),
  );
});

test('a listener that prevents the default blocks navigation even off the active tab', () => {
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: true }));
  render(
    <ThemeProvider scheme="dark">
      <FloatingTabBar {...makeProps(navigate, emit)} />
    </ThemeProvider>,
  );
  fireEvent.press(screen.getByLabelText('Explore'));
  expect(navigate).not.toHaveBeenCalled();
});
