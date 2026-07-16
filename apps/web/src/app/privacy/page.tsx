import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { LegalArticle } from '../../components/legal/legal-article';
import { privacyDoc } from '@tourism/i18n';

export const metadata: Metadata = {
  title: messages.pageMeta.privacy.title,
  description: messages.pageMeta.privacy.description,
};

export default function PrivacyPage() {
  return <LegalArticle doc={privacyDoc} />;
}
