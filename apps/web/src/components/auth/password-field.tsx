'use client';

import { useState } from 'react';
import { CheckIcon, EyeIcon, EyeOffIcon, XIcon } from 'lucide-react';

import { Button, Input, Label, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { passwordStrengthTone, scorePassword } from '../../lib/auth/password';
import type { FieldErrorCode } from '../../lib/auth/validate';
import { AuthFieldError } from './auth-field-error';

/**
 * Shared password input for the auth forms (register · reset · change-password):
 * a controlled field with a show/hide toggle and — when `showMeter` — the same
 * strength bars + requirements checklist, so every place a new password is set
 * looks and behaves identically. `autoComplete` defaults to `new-password` so the
 * browser never autofills the saved login password into a set-password field.
 */
export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  code,
  field = 'password',
  autoComplete = 'new-password',
  showMeter = false,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  code?: FieldErrorCode;
  field?: 'password' | 'confirm';
  autoComplete?: string;
  showMeter?: boolean;
}) {
  const [show, setShow] = useState(false);
  const t = messages.auth.account.securityPage.password;
  const rules = messages.auth.passwordRules;
  const strength = scorePassword(value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          aria-required="true"
          aria-invalid={Boolean(code) || undefined}
          aria-describedby={code ? `${id}-error` : undefined}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setShow((v) => !v)}
          className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"
          aria-label={show ? t.hide : t.show}
        >
          {show ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </Button>
      </div>
      <AuthFieldError id={`${id}-error`} field={field} code={code} />
      {showMeter && value ? (
        <div className="space-y-2 pt-1">
          <div className="flex h-1 gap-1" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-full flex-1 rounded-full transition-colors',
                  i < strength.score
                    ? passwordStrengthTone(strength.score)
                    : 'bg-border',
                )}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            {messages.auth.passwordStrength(strength.score)}
          </p>
          <ul className="space-y-1">
            {strength.rules.map((r) => (
              <li key={r.key} className="flex items-center gap-1.5 text-xs">
                {r.met ? (
                  <CheckIcon className="text-success size-3.5" />
                ) : (
                  <XIcon className="text-muted-foreground size-3.5" />
                )}
                <span
                  className={r.met ? 'text-success' : 'text-muted-foreground'}
                >
                  {rules[r.key]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default PasswordField;
