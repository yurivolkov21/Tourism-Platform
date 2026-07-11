'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  toast,
} from '@tourism/ui';

import { updateOwnProfile } from '../../lib/users/actions';
import type { AdminUserDetail } from '../../lib/users/data';
import { ErrorAlert } from '../crud/error-alert';

interface ProfileCardProps {
  detail: AdminUserDetail;
}

/**
 * Self-service edit card — fullName + phone only (no avatar; the web account keeps the full flow).
 * Rendered by `UserDetail` only when `detail.isSelf` (call site gates it, so `/users/[id]` never
 * shows it for someone else). Stays on the page after saving (no redirect) — a plain `useTransition`
 * handler mirrors `DangerZone`'s pattern rather than `useActionState`, so success is a definite one-
 * shot event (toast + `router.refresh()`) instead of something to infer from a re-rendered state.
 */
export function ProfileCard({ detail }: ProfileCardProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await updateOwnProfile(formData);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        return;
      }
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Profile updated.');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              className="gap-2"
              data-invalid={Boolean(fieldErrors.fullName)}
            >
              <FieldLabel htmlFor="profile-fullName">Full name</FieldLabel>
              <Input
                id="profile-fullName"
                name="fullName"
                aria-required="true"
                maxLength={120}
                defaultValue={detail.fullName ?? ''}
                aria-invalid={Boolean(fieldErrors.fullName)}
              />
              {fieldErrors.fullName ? (
                <FieldError>{fieldErrors.fullName}</FieldError>
              ) : null}
            </Field>

            <Field className="gap-2" data-invalid={Boolean(fieldErrors.phone)}>
              <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
              <Input
                id="profile-phone"
                name="phone"
                type="tel"
                maxLength={20}
                defaultValue={detail.phone ?? ''}
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone ? (
                <FieldError>{fieldErrors.phone}</FieldError>
              ) : null}
            </Field>
          </div>

          {error ? <ErrorAlert>{error}</ErrorAlert> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ProfileCard;
