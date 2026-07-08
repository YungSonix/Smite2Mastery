/**
 * Gods + tierlist slice for lazy loading (no item tag merge).
 */
const godsFile = require('../app/data/God Information/Builds/builds.gods.json');

module.exports = {
  gods: godsFile.gods,
  tierlist: godsFile.tierlist ?? [],
};
module.exports.default = module.exports;
