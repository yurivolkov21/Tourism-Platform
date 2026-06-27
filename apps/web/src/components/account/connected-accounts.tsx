import { CheckCircle2Icon } from 'lucide-react';

import { messages } from '@tourism/i18n';

/** Read-only list of sign-in methods linked to the account (from the Supabase identity providers). */
export function ConnectedAccounts({ providers }: { providers: string[] }) {
  const t = messages.auth.account.connected;
  const labels: Record<string, string> = { google: t.google, email: t.email };
  const items = providers.filter((p) => p in labels);

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t.none}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((p) => (
        <span
          key={p}
          className="bg-muted/50 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
        >
          <CheckCircle2Icon className="text-success size-4" />
          {labels[p]}
        </span>
      ))}
    </div>
  );
}

export default ConnectedAccounts;
