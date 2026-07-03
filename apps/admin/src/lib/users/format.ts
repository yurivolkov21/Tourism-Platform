/** Why the role control is disabled for this user — null when it is allowed. */
export function roleActionDisabledReason(detail: {
  isSelf: boolean;
  isEnvAdmin: boolean;
}): string | null {
  if (detail.isSelf) return 'You cannot change your own role.';
  if (detail.isEnvAdmin)
    return 'This admin is on the ADMIN_EMAILS bootstrap list — edit the env to change it.';
  return null;
}
