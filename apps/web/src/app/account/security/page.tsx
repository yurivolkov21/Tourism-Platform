import { redirect } from 'next/navigation';

/** Security was merged into the unified account settings page. */
export default function AccountSecurityPage() {
  redirect('/account/profile');
}
