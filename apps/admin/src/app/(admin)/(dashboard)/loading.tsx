import { DashboardSkeleton } from '../../../components/motion/dashboard-skeleton';

/** Streams while the dashboard's stats/bookings fetches resolve (cold Render API). */
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
