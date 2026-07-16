import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ChangeEmailForm } from './change-email-form';

const mockSignIn = jest.fn();
const mockUpdateUser = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

// The @tourism/ui barrel re-exports browser-only modules that crash under jsdom — stub the
// pieces this form (and the nested AuthFormField/AuthFieldError) actually use.
jest.mock('@tourism/ui', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  toast: {
    success: (...a: unknown[]) => mockToastSuccess(...a),
    error: (...a: unknown[]) => mockToastError(...a),
  },
  Label: ({
    htmlFor,
    children,
  }: {
    htmlFor?: string;
    children?: React.ReactNode;
  }) => <label htmlFor={htmlFor}>{children}</label>,
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
  FieldError: ({
    id,
    children,
  }: {
    id?: string;
    children?: React.ReactNode;
  }) => (
    <div id={id} role="alert">
      {children}
    </div>
  ),
}));

jest.mock('../../lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignIn, updateUser: mockUpdateUser },
  }),
}));

function fill(email: string, password: string) {
  if (email)
    fireEvent.change(screen.getByLabelText('New email'), {
      target: { value: email },
    });
  if (password)
    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: password },
    });
  fireEvent.submit(screen.getByLabelText('New email').closest('form')!);
}

describe('ChangeEmailForm', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockUpdateUser.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it('requires the current password before doing anything', async () => {
    render(<ChangeEmailForm currentEmail="old@example.com" />);
    fill('new@example.com', '');
    await waitFor(() =>
      expect(screen.getByText('Enter your password.')).toBeInTheDocument(),
    );
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('blocks on a wrong password and never calls updateUser', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });
    render(<ChangeEmailForm currentEmail="old@example.com" />);
    fill('new@example.com', 'wrong-pass');

    await waitFor(() =>
      expect(
        screen.getByText('Incorrect password. Please try again.'),
      ).toBeInTheDocument(),
    );
    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'old@example.com',
      password: 'wrong-pass',
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('verifies the password then calls updateUser with the new email', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
    render(<ChangeEmailForm currentEmail="old@example.com" />);
    fill('new@example.com', 'right-pass');

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledTimes(1));
    expect(mockUpdateUser.mock.calls[0][0]).toEqual({
      email: 'new@example.com',
    });
    expect(mockToastSuccess).toHaveBeenCalled();
  });
});
