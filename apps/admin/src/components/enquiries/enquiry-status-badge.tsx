import { Badge } from '@tourism/ui';

import {
  enquiryStatusMeta,
  type EnquiryStatus,
} from '../../lib/enquiries/status';

/** Coloured pipeline-status pill — shared by the enquiries table and the detail drawer. */
export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  const { label, variant } = enquiryStatusMeta(status);
  return (
    <Badge variant={variant} className="gap-1.5">
      <span
        className="size-1.5 rounded-full bg-current opacity-70"
        aria-hidden
      />
      {label}
    </Badge>
  );
}

export default EnquiryStatusBadge;
