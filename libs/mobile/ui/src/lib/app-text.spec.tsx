import { render, screen } from '@testing-library/react-native';
import { theme as tokens } from '@tourism/tokens/theme';
import { ThemeProvider } from './theme-provider';
import { AppText } from './app-text';

test('renders children with the variant typography', () => {
  render(
    <ThemeProvider>
      <AppText variant="title">Hello</AppText>
    </ThemeProvider>,
  );
  const node = screen.getByText('Hello');
  expect(node.props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ fontSize: 20 })]),
  );
});

test('renders with the muted-foreground color when muted', () => {
  render(
    <ThemeProvider>
      <AppText muted>Muted copy</AppText>
    </ThemeProvider>,
  );
  const node = screen.getByText('Muted copy');
  expect(node.props.style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ color: tokens.colors.light['muted-foreground'] }),
    ]),
  );
});

test('renders with the foreground color when not muted', () => {
  render(
    <ThemeProvider>
      <AppText>Regular copy</AppText>
    </ThemeProvider>,
  );
  const node = screen.getByText('Regular copy');
  expect(node.props.style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ color: tokens.colors.light.foreground }),
    ]),
  );
});
