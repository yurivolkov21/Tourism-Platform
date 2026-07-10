import type { Metadata } from 'next';

import { LegalArticle } from '../../components/legal/legal-article';
import { privacyDoc } from '../../content/privacy';

export const metadata: Metadata = {
  title: 'Privacy Statement',
  description:
    'How we collect, use, share, and protect your personal information.',
};

export default function PrivacyPage() {
  return <LegalArticle doc={privacyDoc} />;
}
