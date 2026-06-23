'use client';

import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { TourSection } from './tour-section';

interface PolicyGroupData {
  title: string;
  items: readonly string[];
}

function PolicyGroup({ group }: { group: PolicyGroupData }) {
  return (
    <div>
      <h3 className="text-primary font-sans mb-2 text-sm font-bold tracking-wide uppercase">
        {group.title}
      </h3>
      <ul className="space-y-2">
        {group.items.map((item) => (
          <li key={item} className="text-muted-foreground flex gap-2.5 text-sm text-pretty">
            <span className="bg-muted-foreground/40 mt-2 size-1 shrink-0 rounded-full" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Policies panel — first group always shown, the rest revealed by a Read-more toggle. */
export function TourPolicies() {
  const t = messages.tourDetail.policies;
  const [expanded, setExpanded] = useState(false);
  const [first, ...rest] = t.groups;

  return (
    <TourSection title={t.heading}>
      <div className="space-y-5">
        <PolicyGroup group={first} />
        {expanded ? rest.map((group) => <PolicyGroup key={group.title} group={group} />) : null}
      </div>
      {rest.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
        >
          {expanded ? t.readLess : t.readMore}
          <ChevronDownIcon className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      ) : null}
    </TourSection>
  );
}

export default TourPolicies;
