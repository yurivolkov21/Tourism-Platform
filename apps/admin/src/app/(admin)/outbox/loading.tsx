import { TableSkeleton } from '../../../components/motion/table-skeleton';

/** Streams while the list fetch resolves (cold Render API). */
export default function Loading() {
  return <TableSkeleton />;
}
