import type { TourDetailData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { Accordion, SectionHeader } from '@tourism/mobile-ui';

type TourDetailPoliciesProps = {
  tour: TourDetailData;
};

export function TourDetailPolicies({ tour }: TourDetailPoliciesProps) {
  const t = messages.tourDetail;

  const items =
    tour.policies && tour.policies.length > 0
      ? tour.policies.map((p) => ({
          id: p.kind,
          title: p.title,
          content: p.body,
        }))
      : t.policies.groups.map((group, index) => ({
          id: `fallback-${index}`,
          title: group.title,
          content: group.items.join('\n\n'),
        }));

  if (items.length === 0) return null;

  return (
    <>
      <SectionHeader title={t.policies.heading} />
      <Accordion items={items} />
    </>
  );
}
