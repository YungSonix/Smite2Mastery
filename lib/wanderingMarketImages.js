/**
 * Featured Wandering Market splash art — Metro requires static requires.
 * Key format: ob{patch}-{shortName} (e.g. ob37-mulan)
 *
 * aspectRatio: width / height of the PNG (900×450 → 2)
 */
const WANDERING_MARKET_IMAGES = {
  'ob38-bastet': {
    source: require('../app/data/Patch Notes/Wandering Market Images/t_WanderingMarket_OB38_Bastet_Featured.png'),
    aspectRatio: 2,
  },
  'ob38-discordia': {
    source: require('../app/data/Patch Notes/Wandering Market Images/t_WanderingMarket_OB38_Discordia_BeachDay_Featured.png'),
    aspectRatio: 2,
  },
  'ob37-nezha': {
    source: require('../app/data/Patch Notes/Wandering Market Images/t_WanderingMarket_OB37_NeZha_Featured.png'),
    aspectRatio: 2,
  },
  'ob37-mulan': {
    source: require('../app/data/Patch Notes/Wandering Market Images/t_WanderingMarket_OB37_Mulan_Featured.png'),
    aspectRatio: 2,
  },
};

function getWanderingMarketAsset(key) {
  if (!key) return null;
  return WANDERING_MARKET_IMAGES[key] ?? null;
}

function getWanderingMarketImage(key) {
  return getWanderingMarketAsset(key)?.source ?? null;
}

module.exports = {
  WANDERING_MARKET_IMAGES,
  getWanderingMarketAsset,
  getWanderingMarketImage,
};
