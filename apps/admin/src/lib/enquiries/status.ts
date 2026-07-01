import type { components } from '@tourism/core';

export type EnquiryStatus = components['schemas']['EnquiryDto']['status'];

/** Badge variant names available in `@tourism/ui`'s `Badge`. */
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

/** CRM pipeline order — used for the status tabs and the change-status control. */
export const ENQUIRY_STATUSES: EnquiryStatus[] = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'];

const STATUS_META: Record<EnquiryStatus, StatusMeta> = {
  NEW: { label: 'New', variant: 'default' },
  CONTACTED: { label: 'Contacted', variant: 'secondary' },
  QUOTED: { label: 'Quoted', variant: 'secondary' },
  WON: { label: 'Won', variant: 'default' },
  LOST: { label: 'Lost', variant: 'destructive' },
};

/** Friendly label + badge variant for an enquiry pipeline status. */
export function enquiryStatusMeta(status: EnquiryStatus): StatusMeta {
  return STATUS_META[status];
}
