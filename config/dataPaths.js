/**
 * Canonical paths for god/build/skin data (Node scripts).
 * App runtime: use `lib/buildsData.js` (Metro require).
 */
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

const BUILDS_JSON_REL = path.join('app', 'data', 'God Information', 'Builds', 'builds.json');
const SKINS_DIR_REL = path.join('app', 'data', 'God Information', 'Skins');
const SMITE2_GODS_JSON_REL = path.join('app', 'data', 'Smite2Gods.json');
const PATCH_NOTES_DIR_REL = path.join('app', 'data', 'Patch Notes');
const DATA_TEMPLATES_DIR_REL = path.join('app', 'data', 'Templates');
const DATA_PROFILE_DIR_REL = path.join('app', 'data', 'Profile');
const DATA_BACKUPS_DIR_REL = path.join('app', 'data', 'Backups');

const BUILDS_JSON = path.join(PROJECT_ROOT, BUILDS_JSON_REL);
const SKINS_DIR = path.join(PROJECT_ROOT, SKINS_DIR_REL);
const SMITE2_GODS_JSON = path.join(PROJECT_ROOT, SMITE2_GODS_JSON_REL);
const PATCH_NOTES_DIR = path.join(PROJECT_ROOT, PATCH_NOTES_DIR_REL);
const DATA_TEMPLATES_DIR = path.join(PROJECT_ROOT, DATA_TEMPLATES_DIR_REL);

/** Legacy path — used only to warn if someone still has a stale copy. */
const LEGACY_BUILDS_JSON = path.join(PROJECT_ROOT, 'app', 'data', 'builds.json');

module.exports = {
  PROJECT_ROOT,
  BUILDS_JSON_REL,
  SKINS_DIR_REL,
  SMITE2_GODS_JSON_REL,
  PATCH_NOTES_DIR_REL,
  DATA_TEMPLATES_DIR_REL,
  DATA_PROFILE_DIR_REL,
  DATA_BACKUPS_DIR_REL,
  BUILDS_JSON,
  SKINS_DIR,
  SMITE2_GODS_JSON,
  PATCH_NOTES_DIR,
  DATA_TEMPLATES_DIR,
  LEGACY_BUILDS_JSON,
};
