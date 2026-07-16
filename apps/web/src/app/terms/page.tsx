import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { LegalArticle } from '../../components/legal/legal-article';
import { termsDoc } from '@tourism/i18n';

export const metadata: Metadata = {
  title: messages.pageMeta.terms.title,
  description: messages.pageMeta.terms.description,
};

export default function TermsPage() {
  return <LegalArticle doc={termsDoc} />;
}
