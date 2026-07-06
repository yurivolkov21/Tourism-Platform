import { render, screen } from '@testing-library/react-native';
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
