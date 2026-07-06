import { render, screen } from '@testing-library/react-native';
import ExploreScreen from './explore';

test('explore placeholder renders its copy', () => {
  render(<ExploreScreen />);
  expect(screen.getByText(/coming in the next update/i)).toBeOnTheScreen();
});
