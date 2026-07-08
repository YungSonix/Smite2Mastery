/**
 * Copy semantic tags from base items to upgraded starters and Evolved * items.
 * Skips acorns and Hunter's Cowl (notepad tags only for those).
 * Run: node scripts/propagate-item-tags.js --write
 */
const { propagateItemTags } = require('./item-tag-shared');
const { loadBuildsWithTags, saveTagsFromSession } = require('./item-tags-io');

const WRITE = process.argv.includes('--write');

const session = loadBuildsWithTags();
const { builds, tagsFile, tagsMap } = session;
const updated = propagateItemTags(builds);

console.log(`Propagated tags on ${updated.length} items:`);
updated.forEach((line) => console.log(' ', line));

if (WRITE) {
  saveTagsFromSession({ tagsFile, flat: session.flat, tagsMap });
  console.log('\nWrote app/data/StringTables/Items/itemTags.json');
} else {
  console.log('\nDry run — pass --write to save');
}
