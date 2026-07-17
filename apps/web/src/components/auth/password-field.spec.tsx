import { fireEvent, render, screen } from '@testing-library/react';

import { PasswordField } from './password-field';

jest.mock('@tourism/ui', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
  Label: ({
    htmlFor,
    children,
  }: {
    htmlFor?: string;
    children?: React.ReactNode;
  }) => <label htmlFor={htmlFor}>{children}</label>,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
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

function renderField(
  props: Partial<React.ComponentProps<typeof PasswordField>> = {},
) {
  const onChange = jest.fn();
  render(
    <PasswordField
      id="pw"
      name="password"
      label="Password"
      value=""
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange };
}

describe('PasswordField', () => {
  it('defaults to autocomplete=new-password (no saved-password autofill)', () => {
    renderField();
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'autoComplete',
      'new-password',
    );
  });

  it('reports typed characters via onChange', () => {
    const { onChange } = renderField();
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'x' },
    });
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('toggles visibility between password and text', () => {
    renderField({ value: 'secret' });
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('shows the requirements checklist only with showMeter + a value', () => {
    renderField({ value: 'Abcdef1!', showMeter: true });
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
  });

  it('hides the meter when the value is empty', () => {
    renderField({ value: '', showMeter: true });
    expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument();
  });

  it('renders the mapped field error for a WEAK code', () => {
    renderField({ value: 'abc', code: 'WEAK' });
    expect(screen.getByRole('alert')).toHaveTextContent('Use 8+ characters');
  });
});
