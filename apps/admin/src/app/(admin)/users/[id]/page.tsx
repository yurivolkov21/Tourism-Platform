import { notFound } from 'next/navigation';

import { UserDetail } from '../../../../components/users/user-detail';
import { getUser, type AdminUserDetail } from '../../../../lib/users/data';

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;

  let detail: AdminUserDetail;
  try {
    detail = await getUser(id);
  } catch {
    notFound();
  }

  return <UserDetail detail={detail} />;
}
