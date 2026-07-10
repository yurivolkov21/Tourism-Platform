import { AppShell } from '../../components/shell/app-shell';
import { requireUser } from '../../lib/auth/require-admin';

/** Protected admin layout — every page in this group renders inside the shell. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return <AppShell email={user.email ?? ''}>{children}</AppShell>;
}
