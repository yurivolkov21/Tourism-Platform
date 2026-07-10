'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2Icon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardContent,
  toast,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { deleteAccount } from '../../lib/account/actions';
import { flashPath } from '../../lib/flash';
import { createClient } from '../../lib/supabase/client';

/** Delete-account control: a confirm dialog → `deleteAccount` action → sign out + leave. */
export function DangerZone() {
  const t = messages.auth.account.danger;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirmDelete() {
    if (pending) return;
    setPending(true);
    const result = await deleteAccount();
    if (result.error) {
      setPending(false);
      toast.error(result.error);
      return;
    }
    await createClient()
      .auth.signOut()
      .catch(() => {
        // The account is gone; leaving is what matters.
      });
    router.push(flashPath('/', 'account-deleted'));
    router.refresh();
  }

  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t.deleteTitle}</h3>
          <p className="text-muted-foreground text-sm text-pretty">
            {t.deleteDesc}
          </p>
        </div>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger
            render={
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 shrink-0"
              />
            }
          >
            <Trash2Icon className="size-4" />
            {t.deleteCta}
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.confirmBody}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>
                {t.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => void confirmDelete()}
                disabled={pending}
              >
                {pending ? t.deleting : t.confirmCta}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default DangerZone;
