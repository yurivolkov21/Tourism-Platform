import type { Metadata } from 'next';

import { LegalArticle } from '../../components/legal/legal-article';
import { termsDoc } from '../../content/terms';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms that govern booking and travelling with us.',
};

export default function TermsPage() {
  return <LegalArticle doc={termsDoc} />;
}
