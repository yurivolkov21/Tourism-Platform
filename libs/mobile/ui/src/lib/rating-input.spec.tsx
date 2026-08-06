import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { RatingInput } from './rating-input';

test('renders 5 stars, filled up to the current value', () => {
  render(
    <ThemeProvider>
      <RatingInput value={3} onChange={jest.fn()} />
    </ThemeProvider>,
  );
  const stars = [1, 2, 3, 4, 5].map((n) =>
    screen.getByRole('button', { name: `${n} star${n > 1 ? 's' : ''}` }),
  );
  expect(stars).toHaveLength(5);
  stars.slice(0, 3).forEach((star) => {
    expect(star.props.accessibilityState).toMatchObject({ selected: true });
  });
  stars.slice(3).forEach((star) => {
    expect(star.props.accessibilityState).toMatchObject({ selected: false });
  });
});

test("tapping a star fires onChange with that star's value", async () => {
  const onChange = jest.fn();
  render(
    <ThemeProvider>
      <RatingInput value={0} onChange={onChange} />
    </ThemeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: '4 stars' }));
  expect(onChange).toHaveBeenCalledWith(4);
});

test('value 0 marks every star unselected', () => {
  render(
    <ThemeProvider>
      <RatingInput value={0} onChange={jest.fn()} />
    </ThemeProvider>,
  );
  expect(
    screen.getByRole('button', { name: '1 star' }).props.accessibilityState,
  ).toMatchObject({ selected: false });
});
