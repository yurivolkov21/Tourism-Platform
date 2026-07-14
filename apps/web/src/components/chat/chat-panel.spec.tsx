import { fireEvent, render, screen } from '@testing-library/react';

import { messages as i18n } from '@tourism/i18n';

// ESM-only / browser-only deps stubbed for jsdom.
jest.mock('ai', () => ({
  DefaultChatTransport: class {
    constructor(public opts: unknown) {}
  },
}));

const mockSendMessage = jest.fn();
const mockRegenerate = jest.fn();
let mockChatState: {
  messages: unknown[];
  status: string;
  error?: Error;
};
jest.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: mockChatState.messages,
    sendMessage: mockSendMessage,
    setMessages: jest.fn(),
    status: mockChatState.status,
    error: mockChatState.error,
    regenerate: mockRegenerate,
  }),
}));

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => null }));

jest.mock('../../lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

jest.mock('@tourism/ui', () => {
  const passthrough =
    (tag: 'div' | 'span' = 'div') =>
    ({ children }: { children?: React.ReactNode }) => {
      const Tag = tag;
      return <Tag>{children}</Tag>;
    };
  return {
    Sheet: ({
      open,
      children,
    }: {
      open?: boolean;
      children?: React.ReactNode;
    }) => (open ? <div>{children}</div> : null),
    SheetContent: passthrough(),
    SheetHeader: passthrough(),
    SheetTitle: passthrough(),
    SheetDescription: passthrough(),
    Bubble: passthrough(),
    BubbleContent: passthrough(),
    Marker: passthrough(),
    MarkerContent: passthrough(),
    MessageScrollerProvider: passthrough(),
    MessageScroller: passthrough(),
    MessageScrollerViewport: passthrough(),
    MessageScrollerContent: passthrough(),
    MessageScrollerItem: passthrough(),
    MessageScrollerButton: () => null,
    Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
    Button: ({
      render: renderProp,
      children,
      ...props
    }: React.ComponentProps<'button'> & { render?: React.ReactElement }) =>
      renderProp ? (
        <a {...(renderProp.props as object)}>{children}</a>
      ) : (
        <button {...props}>{children}</button>
      ),
  };
});

import { ChatPanel } from './chat-panel';

const t = i18n.chatBot;

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  mockChatState = { messages: [], status: 'ready' };
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: false, status: 404 }) as never;
});

describe('ChatPanel', () => {
  it('shows the greeting and suggestion chips on an empty thread', () => {
    render(<ChatPanel open onOpenChange={jest.fn()} />);
    expect(screen.getByText(t.greeting)).toBeInTheDocument();
    expect(screen.getByText(t.suggestions.findTour)).toBeInTheDocument();
    expect(screen.getByText(t.suggestions.talkHuman)).toBeInTheDocument();
  });

  it('sends the typed message and clears the input', () => {
    render(<ChatPanel open onOpenChange={jest.fn()} />);
    const input = screen.getByLabelText(t.inputPlaceholder);
    fireEvent.change(input, { target: { value: 'Any cruises in Ha Long?' } });
    fireEvent.click(screen.getByLabelText(t.sendAria));
    expect(mockSendMessage).toHaveBeenCalledWith({
      text: 'Any cruises in Ha Long?',
    });
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('renders assistant text parts and tool activity markers', () => {
    mockChatState.messages = [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'find tours' }] },
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-searchTours',
            toolCallId: 'c1',
            state: 'output-available',
          },
          { type: 'text', text: 'Here are two options.' },
        ],
      },
    ];
    render(<ChatPanel open onOpenChange={jest.fn()} />);
    expect(screen.getByText('find tours')).toBeInTheDocument();
    expect(screen.getByText(t.toolActivity.searchTours)).toBeInTheDocument();
    expect(screen.getByText('Here are two options.')).toBeInTheDocument();
  });

  it('offers a retry on generic errors', () => {
    mockChatState.error = new Error('boom');
    render(<ChatPanel open onOpenChange={jest.fn()} />);
    expect(screen.getByText(t.error)).toBeInTheDocument();
    fireEvent.click(screen.getByText(t.retry));
    expect(mockRegenerate).toHaveBeenCalled();
  });

  it('shows the unavailable copy (no retry) when the API has no key', () => {
    mockChatState.error = new Error('503 CHAT_UNAVAILABLE');
    render(<ChatPanel open onOpenChange={jest.fn()} />);
    expect(screen.getByText(t.unavailable)).toBeInTheDocument();
    expect(screen.queryByText(t.retry)).not.toBeInTheDocument();
  });
});
