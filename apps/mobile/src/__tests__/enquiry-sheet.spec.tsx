import { createRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { EnquirySheet, type EnquirySheetRef } from '../components/enquiry-sheet';
import { submitEnquiry } from '../lib/enquiry';

jest.mock('../lib/enquiry', () => ({
  ...jest.requireActual('../lib/enquiry'),
  submitEnquiry: jest.fn(),
}));

const mockSubmit = submitEnquiry as jest.MockedFunction<typeof submitEnquiry>;

function renderSheet() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const ref = createRef<EnquirySheetRef>();
  render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <EnquirySheet ref={ref} tourId="uuid-1" tourTitle="Ha Long Bay Cruise" />
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return ref;
}

beforeEach(() => jest.clearAllMocks());

test('shows field errors on empty submit and does not call the API', async () => {
  renderSheet();
  await userEvent.press(screen.getByRole('button', { name: 'Send enquiry' }));
  expect(screen.getByText('Please enter your name.')).toBeOnTheScreen();
  expect(screen.getByText('Please enter a valid email address.')).toBeOnTheScreen();
  expect(screen.getByText('Please write a short message.')).toBeOnTheScreen();
  expect(mockSubmit).not.toHaveBeenCalled();
});

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText('Full name'), 'Jane');
  await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
  await userEvent.type(screen.getByLabelText('Message'), 'July for 2 adults?');
}

test('valid submit sends tourId and shows the success state', async () => {
  mockSubmit.mockResolvedValueOnce({ ok: true });
  renderSheet();
  expect(screen.getByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  await fillValidForm();
  await userEvent.press(screen.getByRole('button', { name: 'Send enquiry' }));
  expect(await screen.findByText(/thanks!/i)).toBeOnTheScreen();
  expect(mockSubmit.mock.calls[0][0]).toMatchObject({
    tourId: 'uuid-1',
    email: 'jane@example.com',
  });
});

test('rate-limited failure shows tailored copy and keeps the input', async () => {
  mockSubmit.mockResolvedValueOnce({ ok: false, rateLimited: true });
  renderSheet();
  await fillValidForm();
  await userEvent.press(screen.getByRole('button', { name: 'Send enquiry' }));
  expect(await screen.findByText(/too many requests/i)).toBeOnTheScreen();
  expect(screen.getByLabelText('Full name').props.value).toBe('Jane');
});
