/**
 * Structured content for long-form legal/policy pages (Privacy, Terms). These are documents, not
 * reusable UI strings, so they live as web-app content modules rather than in the shared i18n
 * catalogue. Bracketed `[…]` values are placeholders the business must complete; every document
 * carries a `reviewNote` flagging that legal counsel must review it before publication.
 */
export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDoc = {
  /** Document title (h1). */
  title: string;
  /** Breadcrumb label for the current page. */
  breadcrumb: string;
  /** Human "Last updated" line. */
  updated: string;
  /** Pre-launch review/disclaimer callout shown at the top of the article. */
  reviewNote: string;
  /** Opening paragraphs before the numbered sections. */
  intro: string[];
  sections: LegalSection[];
};
