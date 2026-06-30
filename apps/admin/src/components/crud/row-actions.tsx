'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tourism/ui';

/**
 * Shared row actions for admin list tables: a ⋮ dropdown (Edit · Delete). Delete opens a controlled
 * AlertDialog and runs `deleteAction(deleteId)`; a 409 (e.g. still active / referenced) keeps the
 * dialog open and surfaces the reason.
 *
 * Base UI notes: the Edit item `render`s a Link with `nativeButton={false}`; the Delete item uses
 * `onClick` (never `render` a `<button>` into a `Menu.Item`); the dialog is controlled, not nested
 * inside the menu.
 */
export function RowActions({
  editHref,
  deleteAction,
  deleteId,
  deleteTitle,
  deleteDescription,
  redirectTo,
}: {
  editHref: string;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  deleteId: string;
  deleteTitle: string;
  deleteDescription: string;
  /** Where to go after a successful delete (e.g. a detail page returning to the list). The list
   * pages omit this — the row just disappears via revalidation. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteAction(deleteId);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Row actions"
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem render={<Link href={editHref} />} nativeButton={false}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setOpen(true)}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirm} disabled={pending}>
              {pending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default RowActions;
