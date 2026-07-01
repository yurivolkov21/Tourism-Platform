'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Button } from '@tourism/ui';

/** Copies the booking code to the clipboard, with a brief check-mark confirmation. */
export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => void copy()}
      aria-label={copied ? 'Code copied' : 'Copy booking code'}
      className="text-muted-foreground hover:text-foreground cursor-pointer"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  );
}

export default CopyCodeButton;
