'use client';

import { useState } from 'react';

import { Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { createClient } from '../../lib/supabase/client';

/** Resend the sign-up confirmation email (browser client). Shown on the register "check inbox" screen. */
export function ResendConfirmation({ email }: { email: string }) {
  const t = messages.auth.register;
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function resend() {
    if (status === 'sending') return;
    setStatus('sending');
    await createClient()
      .auth.resend({ type: 'signup', email })
      .catch(() => {
        // Best-effort; Supabase rate-limits resends. Still show "sent" so we don't leak timing.
      });
    setStatus('sent');
  }

  if (status === 'sent') {
    return <p className="text-muted-foreground text-sm">{t.resent}</p>;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void resend()}
      disabled={status === 'sending'}
    >
      {status === 'sending' ? t.resending : t.resend}
    </Button>
  );
}

export default ResendConfirmation;
