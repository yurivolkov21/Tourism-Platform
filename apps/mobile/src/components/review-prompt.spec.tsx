import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ApiRequestError } from '@tourism/core';
import { ThemeProvider } from '@tourism/mobile-ui';
import { ReviewPrompt } from './review-prompt';
import { createReview } from '../lib/reviews';
import type { BookingVm } from '../lib/booking';

jest.mock('../lib/reviews', () => ({
  ...jest.requireActual('../lib/reviews'),
  createReview: jest.fn(),
}));

const mockCreateReview = createReview as jest.Mock;

const booking: BookingVm = {
  code: 'BK-7Q2KX9AB',
  status: 'PAID',
  statusMeta: { label: 'Paid', tone: 'success' },
  tourTitle: 'Hoi An Walking Tour',
  tourSlug: 'hoi-an-walking-tour',
  departureLabel: 'Sat, 15 Aug 2026',
  departureDate: '2026-08-15',
  bookedOn: '07 Jul 2026',
  party: '2 adults',
  totalAmount: 300,
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'Nguyen Van A',
  contactEmail: 'a@example.com',
  hasReview: false,
};

function renderPrompt(vm: BookingVm) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ReviewPrompt booking={vm} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockCreateReview.mockReset();
});

test('hasReview: true shows the already-reviewed panel, no form', () => {
  renderPrompt({ ...booking, hasReview: true });
  expect(screen.getByText('You’ve already reviewed this trip')).toBeTruthy();
  expect(screen.queryByTestId('submit-review')).toBeNull();
});

test('hasReview: false renders the form', () => {
  renderPrompt(booking);
  expect(screen.getByText('Rate this trip')).toBeTruthy();
  expect(screen.getByTestId('submit-review')).toBeTruthy();
});

test('submitting an empty body shows the field error and does not call the API', async () => {
  renderPrompt(booking);
  await userEvent.press(screen.getByRole('button', { name: '5 stars' }));
  await userEvent.press(screen.getByTestId('submit-review'));
  expect(await screen.findByText('Write a short review.')).toBeTruthy();
  expect(mockCreateReview).not.toHaveBeenCalled();
});

test('happy path shows the success panel', async () => {
  mockCreateReview.mockResolvedValue({ id: 'r-1' });
  renderPrompt(booking);
  await userEvent.press(screen.getByRole('button', { name: '5 stars' }));
  await userEvent.type(
    screen.getByTestId('review-body'),
    'Loved every minute of it.',
  );
  await userEvent.press(screen.getByTestId('submit-review'));
  expect(await screen.findByText('Thanks for your review')).toBeTruthy();
});

test('REVIEW_ALREADY_EXISTS shows the already-reviewed panel instead of a banner', async () => {
  mockCreateReview.mockRejectedValue(
    new ApiRequestError(409, {
      code: 'REVIEW_ALREADY_EXISTS',
      message: 'x',
    } as never),
  );
  renderPrompt(booking);
  await userEvent.press(screen.getByRole('button', { name: '5 stars' }));
  await userEvent.type(
    screen.getByTestId('review-body'),
    'Loved every minute of it.',
  );
  await userEvent.press(screen.getByTestId('submit-review'));
  expect(
    await screen.findByText('You’ve already reviewed this trip'),
  ).toBeTruthy();
});

test('other API errors show the mapped banner text', async () => {
  mockCreateReview.mockRejectedValue(
    new ApiRequestError(400, {
      code: 'REVIEW_NOT_ELIGIBLE',
      message: 'x',
    } as never),
  );
  renderPrompt(booking);
  await userEvent.press(screen.getByRole('button', { name: '5 stars' }));
  await userEvent.type(
    screen.getByTestId('review-body'),
    'Loved every minute of it.',
  );
  await userEvent.press(screen.getByTestId('submit-review'));
  expect(
    await screen.findByText('This booking isn’t eligible for a review yet.'),
  ).toBeTruthy();
});
