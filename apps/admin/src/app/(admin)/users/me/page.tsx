import { notFound } from 'next/navigation';

import { UserDetail } from '../../../../components/users/user-detail';
import { getOwnUser, type AdminUserDetail } from '../../../../lib/users/data';

/** The signed-in admin's own detail page — the `me` static segment wins over `[id]` (no collision). */
export default async function OwnUserPage() {
  let detail: AdminUserDetail;
  try {
    detail = await getOwnUser();
  } catch {
    notFound();
  }

  return <UserDetail detail={detail} />;
}
