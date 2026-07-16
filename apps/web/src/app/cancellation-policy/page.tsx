import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { LegalArticle } from '../../components/legal/legal-article';
import { cancellationDoc } from '@tourism/i18n';

export const metadata: Metadata = {
  title: messages.pageMeta.cancellation.title,
  description: messages.pageMeta.cancellation.description,
};

export default function CancellationPolicyPage() {
  return <LegalArticle doc={cancellationDoc} />;
}
