/** Directories/files included in polish backup (code only — not game asset blobs). */
export const BACKUP_ROOTS = ['app', 'lib', 'hooks', 'config'];

export const BACKUP_SKIP_DIRS = new Set([
  'node_modules',
  '.expo',
  'Icons',
  'God Renders',
  'Voice Audio',
  'Wallpapers',
  'Backups',
]);

export const BACKUP_EXTENSIONS = new Set(['.jsx', '.js', '.mjs', '.json', '.ts', '.tsx']);
