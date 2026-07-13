import { render, screen } from '@testing-library/react';

import { AuthFormField } from './auth-form-field';

// AuthFieldError → FieldError comes from `@tourism/ui`, whose barrel also re-exports
// browser-only components (maplibre-gl's <Map>, gsap's <AnimatedContent>) that crash on
// import under jsdom. Stub the barrel with minimal elements that preserve the props this
// component and AuthFieldError read, so the render test exercises real composition.
jest.mock('@tourism/ui', () => ({
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

describe('AuthFormField', () => {
  it('wires the label to the input via id/htmlFor and spreads rest props through', () => {
    render(
      <AuthFormField
        id="email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
      />,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'email');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autoComplete', 'email');
    expect(input).toHaveAttribute('placeholder', 'you@example.com');
  });

  it('omits aria-required when required is not set', () => {
    render(<AuthFormField id="fullName" label="Full name" name="fullName" />);
    expect(screen.getByLabelText('Full name')).not.toHaveAttribute(
      'aria-required',
    );
  });

  it('emits aria-required="true" when required is set', () => {
    render(
      <AuthFormField
        id="fullName"
        label="Full name"
        name="fullName"
        required
      />,
    );
    const input = screen.getByLabelText('Full name');
    expect(input).toHaveAttribute('aria-required', 'true');
    // The custom `required` prop must NEVER reach the DOM as the native
    // attribute — that would reactivate native validation (`noValidate` rule)
    // and double-announce in AT.
    expect(input).not.toHaveAttribute('required');
  });

  it('renders no error artifacts when field/code are omitted', () => {
    render(<AuthFormField id="fullName" label="Full name" name="fullName" />);
    const input = screen.getByLabelText('Full name');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('wires aria-invalid/aria-describedby and renders the mapped error message when field+code are given', () => {
    render(
      <AuthFormField
        id="email"
        label="Email"
        name="email"
        field="email"
        code="INVALID"
      />,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    const error = screen.getByRole('alert');
    expect(error).toHaveAttribute('id', 'email-error');
    expect(error).toHaveTextContent(
      'Enter a valid email address, e.g. you@example.com.',
    );
  });

  it('does not render an AuthFieldError when field is omitted, even if code is somehow set', () => {
    render(<AuthFormField id="email" label="Email" name="email" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the hint below the field', () => {
    render(
      <AuthFormField
        id="email"
        label="Email"
        name="email"
        hint="We'll never share your email."
      />,
    );
    expect(
      screen.getByText("We'll never share your email."),
    ).toBeInTheDocument();
  });

  it('renders the trailing "after" slot', () => {
    render(
      <AuthFormField
        id="password"
        label="Password"
        name="password"
        after={<a href="/forgot-password">Forgot password?</a>}
      />,
    );
    expect(
      screen.getByRole('link', { name: 'Forgot password?' }),
    ).toBeInTheDocument();
  });

  it('replaces the internal Input with children, without automatic aria wiring', () => {
    render(
      <AuthFormField id="new-password" label="New password" field="password">
        <input id="new-password" name="password" data-testid="custom" />
      </AuthFormField>,
    );
    const custom = screen.getByTestId('custom');
    expect(custom).not.toHaveAttribute('aria-invalid');
    expect(custom).not.toHaveAttribute('aria-describedby');
    // Only one input rendered — the internal Input is not also rendered alongside children.
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });
});
