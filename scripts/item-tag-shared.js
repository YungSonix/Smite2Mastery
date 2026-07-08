/**
 * Shared item tag helpers — notepad apply + T2 starter / Evolved propagation.
 */
const STRUCTURAL_TAGS = new Set([
  'Tier1',
  'Tier2',
  'Tier3',
  'ItemTier.Tier1',
  'ItemTier.Tier2',
  'Component',
  'StartingLoadout',
  'NoResaleValue',
  'Starter',
  'Relic',
  'Consumable',
  'Passive',
  'Role',
]);

/** T2 starters with explicit notepad tags — skip auto-inherit from T1 component. */
const NO_PROPAGATE_INTERNAL = new Set([
  'HuntersCowl',
  'MagicAcorn',
  'LivelyAcorn',
  'AshwhorlAcorn',
  'BriskberryAcorn',
  'ThistlethornAcorn',
]);

const EVOLVED_TO_BASE = {
  EvolvedBookOfThoth: 'BookOfThoth',
  EvolvedDevourersGauntlet: 'DevourersGauntlet',
  EvolvedPropheticCloak: 'PropheticCloak',
  EvolvedRage: 'Rage',
  EvolvedTranscendence: 'Transcendence',
};

function semanticTags(item) {
  return (item?.tags || []).filter((t) => !STRUCTURAL_TAGS.has(t));
}

function mergeTags(item, semanticFromSource) {
  const structural = (item.tags || []).filter((t) => STRUCTURAL_TAGS.has(t));
  const out = [...structural];
  semanticFromSource.forEach((t) => {
    if (t && !out.includes(t)) out.push(t);
  });
  return out;
}

function stripSemanticTags(flat) {
  let count = 0;
  flat.forEach((item) => {
    const before = item.tags || [];
    const next = before.filter((t) => STRUCTURAL_TAGS.has(t));
    if (before.length !== next.length) count += 1;
    item.tags = next;
  });
  return count;
}

function propagateItemTags(builds) {
  const flat = builds.items.flat(2).filter((i) => i && i.internalName);
  const byInternal = new Map(flat.map((i) => [i.internalName, i]));
  const updated = [];

  flat.forEach((item) => {
    if (!item.starter || item.tier !== 2) return;
    if (NO_PROPAGATE_INTERNAL.has(item.internalName)) return;
    const baseKey = (item.components || [])[0];
    if (!baseKey) return;
    const base = byInternal.get(baseKey);
    if (!base) return;
    const sem = semanticTags(base);
    if (!sem.length) return;
    const next = mergeTags(item, sem);
    if (JSON.stringify(item.tags) !== JSON.stringify(next)) {
      item.tags = next;
      updated.push(`${item.name} ← ${base.name}: ${sem.join(', ')}`);
    }
  });

  Object.entries(EVOLVED_TO_BASE).forEach(([evolvedKey, baseKey]) => {
    const item = byInternal.get(evolvedKey);
    const base = byInternal.get(baseKey);
    if (!item || !base) return;
    const sem = semanticTags(base);
    if (!sem.length) return;
    const next = mergeTags(item, sem);
    if (JSON.stringify(item.tags) !== JSON.stringify(next)) {
      item.tags = next;
      updated.push(`${item.name} ← ${base.name}: ${sem.join(', ')}`);
    }
  });

  return updated;
}

module.exports = {
  STRUCTURAL_TAGS,
  NO_PROPAGATE_INTERNAL,
  semanticTags,
  mergeTags,
  stripSemanticTags,
  propagateItemTags,
};
