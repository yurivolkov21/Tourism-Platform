'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  toast,
} from '@tourism/ui';

import { changeUserRole, deleteUser } from '../../lib/users/actions';
import type { AdminUserDetail, UserRole } from '../../lib/users/data';
import { roleActionDisabledReason } from '../../lib/users/format';

const ROLE_LABEL: Record<UserRole, string> = {
  CUSTOMER: 'Customer',
  ADMIN: 'Admin',
};

interface DangerZoneProps {
  detail: AdminUserDetail;
}

/**
 * High-impact controls for a user's detail page: role change + delete. Mirrors the
 * AlertDialog/toast/`useTransition` conventions from `RefundBooking` and `MediaLibraryView` — a
 * controlled dialog per action, the dialog stays open and shows the error on failure, success fires a
 * toast plus `router.refresh()` (role) or `router.push('/users')` (delete).
 */
export function DangerZone({ detail }: DangerZoneProps) {
  const router = useRouter();

  const [role, setRole] = useState<UserRole>(detail.role);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleChanging, startRoleChange] = useTransition();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  const roleDisabledReason = roleActionDisabledReason(detail);
  const roleUnchanged = role === detail.role;

  const confirmRoleChange = () => {
    setRoleError(null);
    startRoleChange(async () => {
      const result = await changeUserRole(detail.id, role);
      if (result.ok) {
        toast.success('Role updated.');
        setRoleDialogOpen(false);
        router.refresh();
      } else {
        const message = result.error ?? 'Could not change role.';
        setRoleError(message);
        toast.error(message);
      }
    });
  };

  const confirmDelete = () => {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteUser(detail.id);
      if (result.ok) {
        toast.success('User deleted.');
        setDeleteDialogOpen(false);
        router.push('/users');
      } else {
        const message = result.error ?? 'Could not delete user.';
        setDeleteError(message);
        toast.error(message);
      }
    });
  };

  const showDelete = !detail.isSelf;
  const deleteDisabled = detail.role === 'ADMIN';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Role</p>
            <p className="text-muted-foreground text-sm">
              Currently{' '}
              <span className="text-foreground font-medium">{ROLE_LABEL[detail.role]}</span>.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={role}
                onValueChange={(v) => setRole((v as UserRole) ?? detail.role)}
                disabled={Boolean(roleDisabledReason)}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setRoleDialogOpen(true)}
                disabled={Boolean(roleDisabledReason) || roleUnchanged}
              >
                Apply
              </Button>
            </div>
            {roleDisabledReason ? (
              <p className="text-muted-foreground text-xs">{roleDisabledReason}</p>
            ) : null}
          </div>

          {showDelete ? (
            <>
              <Separator />

              {/* Delete */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Delete account</p>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleteDisabled}
                >
                  Delete user
                </Button>
                {deleteDisabled ? (
                  <p className="text-muted-foreground text-xs">Demote to customer first.</p>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={roleDialogOpen}
        onOpenChange={(next) => {
          setRoleDialogOpen(next);
          if (!next) setRoleError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role?</AlertDialogTitle>
            <AlertDialogDescription>
              Change {detail.email} from {ROLE_LABEL[detail.role]} to {ROLE_LABEL[role]}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {roleError ? (
            <p className="text-destructive text-sm" role="alert">
              {roleError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={roleChanging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={role === 'CUSTOMER' ? 'destructive' : 'default'}
              onClick={confirmRoleChange}
              disabled={roleChanging}
            >
              {roleChanging ? 'Applying…' : 'Apply'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(next) => {
          setDeleteDialogOpen(next);
          if (!next) setDeleteError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently deletes {detail.email}&apos;s account and sign-in. Accounts with bookings or
              authored posts cannot be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p className="text-destructive text-sm" role="alert">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DangerZone;
