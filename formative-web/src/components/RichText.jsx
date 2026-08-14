import { markdownToSafeHtml } from '../lib/richText';

export default function RichText({ text, className }) {
  const html = markdownToSafeHtml(text);
  if (!html) return null;
  return <div className={className || 'f-md'} dangerouslySetInnerHTML={{ __html: html }} />;
}
