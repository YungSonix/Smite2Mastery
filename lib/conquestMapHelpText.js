import { STRING_TABLES } from './stringTables.generated';

/** Strip SMITE highlight markup from help-tip strings (<Highlight>…</> or </Highlight>). */
export function formatConquestHelpText(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/<\/?[Hh]ighlight>/g, '')
    .replace(/<\/>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function getHelpTip(key) {
  if (!key) return '';
  return formatConquestHelpText(STRING_TABLES?.helpTips?.[key] || '');
}

export function joinHelpTips(keys, separator = '\n\n') {
  return keys
    .map((key) => getHelpTip(key))
    .filter(Boolean)
    .join(separator);
}
