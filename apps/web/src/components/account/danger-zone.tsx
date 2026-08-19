'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDownIcon, Trash2Icon } from 'lucide-react';

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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  toast,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { deleteAccount } from '../../lib/account/actions';
import { flashPath } from '../../lib/flash';
import { createClient } from '../../lib/supabase/client';

/**
 * Delete-account control: a confirm dialog → `deleteAccount` action → sign out + leave.
 *
 * Renders only the control — the section around it already carries the "Danger zone" heading.
 *
 * The delete button stays behind a collapsed panel. The action is irreversible, so it should cost a
 * deliberate click to even see it — an always-visible delete button carries the same visual weight
 * as "save your phone number", which is the wrong reading of the risk.
 */
export function DangerZone() {
  const t = messages.auth.account.danger;
  const toggle = messages.auth.account.settings.dangerToggle;
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
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
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger
        render={<Button variant="outline" size="sm" className="gap-2" />}
      >
        {expanded ? toggle.hide : toggle.show}
        <ChevronDownIcon
          className={`size-4 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="nx-collapsible">
        <div className="border-destructive/20 mt-4 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default DangerZone;
