/**
 * God Renders folder name → canonical godName when folder spelling ≠ pantheon JSON.
 * Used by extract, audit rebuild, and vision-tag batch scripts.
 */
const RENDER_FOLDER_GOD_ALIASES = {
  cernennos: 'Cernunnos',
  'sun wokong': 'Sun Wukong',
  'morgan le fay': 'Morgan Le Fay',
  ahpuch: 'Ah Puch',
  hunbatz: 'Hun Batz',
  'guan yu': 'Guan Yu',
  'hou yi': 'Hou Yi',
};

function normalizeFolderKey(folderName) {
  return String(folderName || '')
    .trim()
    .toLowerCase();
}

function godNameFromRenderFolder(folderName, fallbackTitleCase) {
  const key = normalizeFolderKey(folderName);
  if (RENDER_FOLDER_GOD_ALIASES[key]) return RENDER_FOLDER_GOD_ALIASES[key];
  return typeof fallbackTitleCase === 'function' ? fallbackTitleCase(folderName) : folderName;
}

module.exports = {
  RENDER_FOLDER_GOD_ALIASES,
  normalizeFolderKey,
  godNameFromRenderFolder,
};
