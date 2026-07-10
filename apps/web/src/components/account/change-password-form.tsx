'use client';

import { useState, type FormEvent } from 'react';
import { CheckIcon, EyeIcon, EyeOffIcon, XIcon } from 'lucide-react';

import { Button, Input, Label, cn, toast } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { authErrorMessage } from '../../lib/auth/auth-error';
import {
  passwordStrengthTone,
  scorePassword,
  validatePasswordPair,
} from '../../lib/auth/password';
import { createClient } from '../../lib/supabase/client';

/** Change password while signed in (browser `updateUser`). */
export function ChangePasswordForm() {
  const t = messages.auth.account.securityPage.password;
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string>();
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const strength = scorePassword(pw);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFieldError(undefined);

    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    const confirm = String(data.get('confirm') ?? '');

    const invalid = validatePasswordPair(password, confirm);
    if (invalid) {
      setFieldError(messages.auth.passwordErrors[invalid]);
      setPending(false);
      return;
    }

    const { error: updateError } = await createClient().auth.updateUser({
      password,
    });
    if (updateError) {
      toast.error(authErrorMessage(updateError));
      setPending(false);
      return;
    }

    form.reset();
    setPw('');
    setShow(false);
    toast.success(t.success);
    setPending(false);
  }

  const rules = messages.auth.passwordRules;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h3 className="text-sm font-medium">{t.heading}</h3>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">{t.newLabel}</Label>
        <div className="relative">
          <Input
            id="new-password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="pr-10"
            required
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
        {pw ? (
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
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">{t.confirmLabel}</Label>
        <Input
          id="confirm-password"
          name="confirm"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          required
        />
      </div>
      {fieldError ? (
        <p className="text-destructive text-sm" role="alert">
          {fieldError}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

export default ChangePasswordForm;
