'use client';

import { Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { useSignOut } from './use-sign-out';

/** Client sign-out control for server components (e.g. the account page). See {@link useSignOut}. */
export function SignOutButton() {
  const signOut = useSignOut();
  return (
    <Button type="button" variant="outline" onClick={() => void signOut()}>
      {messages.auth.account.signOut}
    </Button>
  );
}

export default SignOutButton;
