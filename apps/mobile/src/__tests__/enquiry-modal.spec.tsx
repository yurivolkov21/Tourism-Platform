import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import EnquiryModal from '../app/tours/[slug]/enquiry';
import { submitEnquiry } from '../lib/enquiry';
import { fetchTourDetail, type TourDetailVm } from '../lib/tour-detail';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ slug: 'ha-long-cruise' }),
}));

jest.mock('../lib/tour-detail', () => ({
  ...jest.requireActual('../lib/tour-detail'),
  fetchTourDetail: jest.fn(),
}));

jest.mock('../lib/enquiry', () => ({
  ...jest.requireActual('../lib/enquiry'),
  submitEnquiry: jest.fn(),
}));

const mockDetail = fetchTourDetail as jest.MockedFunction<typeof fetchTourDetail>;
const mockSubmit = submitEnquiry as jest.MockedFunction<typeof submitEnquiry>;

const vm = { id: 'uuid-1', title: 'Ha Long Bay Cruise' } as TourDetailVm;

function renderModal() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <EnquiryModal />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

test('shows field errors on empty submit and does not call the API', async () => {
  mockDetail.mockResolvedValueOnce(vm);
  renderModal();
  await screen.findByText('Ha Long Bay Cruise');
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
  mockDetail.mockResolvedValueOnce(vm);
  mockSubmit.mockResolvedValueOnce({ ok: true });
  renderModal();
  await screen.findByText('Ha Long Bay Cruise');
  await fillValidForm();
  await userEvent.press(screen.getByRole('button', { name: 'Send enquiry' }));
  expect(await screen.findByText(/thanks!/i)).toBeOnTheScreen();
  expect(mockSubmit.mock.calls[0][0]).toMatchObject({
    tourId: 'uuid-1',
    email: 'jane@example.com',
  });
});

test('rate-limited failure shows tailored copy and keeps the input', async () => {
  mockDetail.mockResolvedValueOnce(vm);
  mockSubmit.mockResolvedValueOnce({ ok: false, rateLimited: true });
  renderModal();
  await screen.findByText('Ha Long Bay Cruise');
  await fillValidForm();
  await userEvent.press(screen.getByRole('button', { name: 'Send enquiry' }));
  expect(await screen.findByText(/too many requests/i)).toBeOnTheScreen();
  expect(screen.getByLabelText('Full name').props.value).toBe('Jane');
});
