/**
 * Markdown-stripping helpers shared by the blog's derived-text paths. Two levels:
 *
 * - `stripInlineMarkdown` — a single heading line, reduced to exactly what react-markdown
 *   renders as text (links → text, images → nothing, code → content, emphasis unwrapped),
 *   so outline anchor ids match the rendered headings' ids.
 * - `stripMarkdownSyntax` — a whole document flattened for word-level uses
 *   (`readingStats`, `fallbackExcerpt`); crude on purpose, callers tokenize/collapse.
 */

/** Inline markdown → the text react-markdown would render for it (whitespace collapsed). */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images render no text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
    .replace(/`([^`]*)`/g, '$1') // inline code → its content
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/([*_])(.*?)\1/g, '$2') // emphasis
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/\s+/g, ' ')
    .trim();
}

/** Document-level strip: fences and images → space, links → text, syntax chars → space. */
export function stripMarkdownSyntax(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
    .replace(/[#>*_~`|-]+/g, ' '); // markdown syntax chars
}
