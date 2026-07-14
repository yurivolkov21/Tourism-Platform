import { render, screen } from '@testing-library/react';

import { messages } from '@tourism/i18n';

import { FloatingContact } from './floating-contact';

// The `@tourism/ui` barrel re-exports browser-only components (maplibre-gl, gsap) that
// crash on import under jsdom — stub the popover primitives with minimal passthroughs
// (open state always rendered) so the test exercises this component's own composition.
jest.mock('@tourism/ui', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({
    children,
    ...props
  }: React.ComponentProps<'button'> & { children?: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  PopoverContent: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverHeader: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTitle: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverDescription: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

let mockPathname = '/';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

const t = messages.contactLauncher;
const ENV_KEY = 'NEXT_PUBLIC_CHAT_WHATSAPP';
const envBackup = process.env[ENV_KEY];

afterEach(() => {
  process.env[ENV_KEY] = envBackup;
});

describe('FloatingContact', () => {
  it('renders the launcher trigger with its accessible label', () => {
    mockPathname = '/';
    render(<FloatingContact />);
    expect(
      screen.getByRole('button', { name: t.triggerAria }),
    ).toBeInTheDocument();
  });

  it.each(['/checkout/success', '/checkout/cancel', '/tours/ha-long/book'])(
    'renders nothing on money-path route %s',
    (pathname) => {
      mockPathname = pathname;
      const { container } = render(<FloatingContact />);
      expect(container).toBeEmptyDOMElement();
    },
  );

  it('shows WhatsApp (prefilled deep link, new tab) and enquiry channels when configured', () => {
    mockPathname = '/tours';
    process.env[ENV_KEY] = '+84 912 345 678';
    render(<FloatingContact />);

    const whatsapp = screen.getByRole('link', {
      name: new RegExp(t.whatsapp.label),
    });
    expect(whatsapp).toHaveAttribute(
      'href',
      `https://wa.me/84912345678?text=${encodeURIComponent(t.prefillGeneric)}`,
    );
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer');

    expect(
      screen.getByRole('link', { name: new RegExp(t.enquiry.label) }),
    ).toHaveAttribute('href', '/contact');
  });

  it('hides the WhatsApp channel when the env is unset, keeping enquiry', () => {
    mockPathname = '/';
    delete process.env[ENV_KEY];
    render(<FloatingContact />);

    expect(
      screen.queryByRole('link', { name: new RegExp(t.whatsapp.label) }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: new RegExp(t.enquiry.label) }),
    ).toHaveAttribute('href', '/contact');
  });
});
