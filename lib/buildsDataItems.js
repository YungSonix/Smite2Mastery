/**
 * Items slice for lazy loading. Tags merged from itemTags.json at require time.
 */
const { items } = require('../app/data/God Information/Builds/builds.items.json');
const { attachTagsToBuilds } = require('./itemTagsData');

const builds = { items };
attachTagsToBuilds(builds);

module.exports = { items: builds.items };
module.exports.default = { items: builds.items };
