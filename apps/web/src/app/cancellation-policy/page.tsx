import type { Metadata } from 'next';

import { LegalArticle } from '../../components/legal/legal-article';
import { cancellationDoc } from '../../content/cancellation';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy',
  description:
    'How to cancel a booking with us, what to expect, and how refunds are handled.',
};

export default function CancellationPolicyPage() {
  return <LegalArticle doc={cancellationDoc} />;
}
