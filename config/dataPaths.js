/**
 * Canonical paths for god/build/skin data (Node scripts).
 * App runtime: use `lib/buildsData.js` (Metro require).
 */
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

const BUILDS_JSON_REL = path.join('app', 'data', 'God Information', 'Builds', 'builds.json');
const SKINS_DIR_REL = path.join('app', 'data', 'God Information', 'Skins');

const BUILDS_JSON = path.join(PROJECT_ROOT, BUILDS_JSON_REL);
const SKINS_DIR = path.join(PROJECT_ROOT, SKINS_DIR_REL);

/** Legacy path — used only to warn if someone still has a stale copy. */
const LEGACY_BUILDS_JSON = path.join(PROJECT_ROOT, 'app', 'data', 'builds.json');

module.exports = {
  PROJECT_ROOT,
  BUILDS_JSON_REL,
  SKINS_DIR_REL,
  BUILDS_JSON,
  SKINS_DIR,
  LEGACY_BUILDS_JSON,
};
