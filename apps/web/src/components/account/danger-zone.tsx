'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2Icon } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { deleteAccount } from '../../lib/account/actions';
import { createClient } from '../../lib/supabase/client';

/** Delete-account control: a confirm dialog → `deleteAccount` action → sign out + leave. */
export function DangerZone() {
  const t = messages.auth.account.danger;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function confirmDelete() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const result = await deleteAccount();
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    await createClient()
      .auth.signOut()
      .catch(() => {
        // The account is gone; leaving is what matters.
      });
    router.push('/');
    router.refresh();
  }

  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t.deleteTitle}</h3>
          <p className="text-muted-foreground text-sm text-pretty">{t.deleteDesc}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 shrink-0"
              />
            }
          >
            <Trash2Icon className="size-4" />
            {t.deleteCta}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.confirmTitle}</DialogTitle>
              <DialogDescription>{t.confirmBody}</DialogDescription>
            </DialogHeader>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                {t.cancel}
              </Button>
              <Button variant="destructive" onClick={() => void confirmDelete()} disabled={pending}>
                {pending ? t.deleting : t.confirmCta}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default DangerZone;
