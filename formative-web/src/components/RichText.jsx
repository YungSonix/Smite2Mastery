import { markdownToSafeHtml, looksLikeHtml, sanitizeRichHtml } from '../lib/richText';

export default function RichText({ text, className }) {
  const raw = String(text || '');
  const html = looksLikeHtml(raw) ? sanitizeRichHtml(raw) : markdownToSafeHtml(raw);
  if (!html) return null;
  return <div className={className || 'f-md'} dangerouslySetInnerHTML={{ __html: html }} />;
}
