/**

 * Full builds object — prefer `loadBuildsData()` for app screens (lazy sections).

 * Scripts/API still use canonical `builds.json`; run `npm run builds:split` after edits.

 *

 * Item tags merged from `app/data/StringTables/Items/itemTags.json`.

 */

const { attachTagsToBuilds } = require('./itemTagsData');



let builds;



try {

  const godsFile = require('../app/data/God Information/Builds/builds.gods.json');

  const itemsFile = require('../app/data/God Information/Builds/builds.items.json');

  builds = {

    gods: godsFile.gods,

    tierlist: godsFile.tierlist ?? [],

    items: itemsFile.items,

  };

} catch {

  builds = require('../app/data/God Information/Builds/builds.json');

}



attachTagsToBuilds(builds);



module.exports = builds;

module.exports.default = builds;

