import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FloatingTabBar, type FloatingTabBarProps } from './floating-tab-bar';
import { ThemeProvider } from './theme-provider';

// safe-area-context is stubbed in ../test-setup.ts (insets = 0).

function makeProps(navigate: jest.Mock): FloatingTabBarProps {
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
    navigation: { navigate },
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
