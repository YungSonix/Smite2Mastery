/** Editable tierlist model — local copies of mentor templates; never writes to builds.json. */

export const TIER_COLOR_PRESETS = [
  '#991b1b',
  '#9a3412',
  '#a16207',
  '#3f6212',
  '#166534',
  '#1e3a5f',
  '#4c1d95',
  '#64748b',
];

const TIER_LETTER_COLORS = {
  S: '#991b1b',
  A: '#9a3412',
  B: '#a16207',
  C: '#166534',
  D: '#1e3a5f',
  F: '#4c1d95',
};

function tierLetterFromName(tierName) {
  const m = String(tierName || '').match(/^([SABCDEF])/i);
  return m ? m[1].toUpperCase() : null;
}

export function defaultTierColor(tierName, index = 0) {
  const letter = tierLetterFromName(tierName);
  if (letter && TIER_LETTER_COLORS[letter]) return TIER_LETTER_COLORS[letter];
  return TIER_COLOR_PRESETS[index % TIER_COLOR_PRESETS.length];
}

export function editorStorageKey(templateKey, tierCategory) {
  return `tierlist_editor_${tierCategory}_${templateKey}`;
}

export function godDisplayName(god) {
  return god?.godName || god?.GodName || god?.name || god?.title || '';
}

export function godHasAspect(god) {
  const aspect = god?.aspect || god?.baseInformation?.aspect;
  if (!aspect || typeof aspect !== 'object') return false;
  return Boolean(aspect.icon || (aspect.name && String(aspect.name).trim()));
}

export function buildAssignableGodLabels(gods) {
  const labels = [];
  for (const god of gods || []) {
    const name = godDisplayName(god);
    if (!name) continue;
    labels.push(name);
    if (godHasAspect(god)) {
      labels.push(`${name} (Aspect)`);
    }
  }
  return labels.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function labelsInTiers(tiers) {
  const set = new Set();
  for (const tier of tiers || []) {
    for (const label of tier.gods || []) {
      set.add(label);
    }
  }
  return set;
}

export function computeUnassignedLabels(allLabels, tiers) {
  const placed = labelsInTiers(tiers);
  return allLabels.filter((label) => !placed.has(label));
}

export function mentorToEditorState({ role, roleData, tierCategory }) {
  const author = roleData?.updatedBy || 'Mentor';
  const roleSlug = String(role?.key || 'tierlist').replace(/^beginner_/, '');
  const list = Array.isArray(roleData?.list) ? roleData.list : [];

  return {
    templateKey: role.key,
    tierCategory,
    listName: `${roleSlug} Tierlist - ${author} (Mentor)`,
    showNames: false,
    tiers: list.map((tier, i) => ({
      id: `tier-${i}-${tier.tierName}`,
      tierName: tier.tierName || `Tier ${i + 1}`,
      color: defaultTierColor(tier.tierName, i),
      gods: [...(tier.gods || [])],
    })),
  };
}

export function createEmptyTier(index = 0) {
  return {
    id: `tier-new-${Date.now()}-${index}`,
    tierName: 'New Tier',
    color: TIER_COLOR_PRESETS[index % TIER_COLOR_PRESETS.length],
    gods: [],
  };
}

export function moveLabelToTier(state, label, tierId) {
  if (!label || !tierId) return state;
  return {
    ...state,
    tiers: state.tiers.map((tier) => {
      const without = (tier.gods || []).filter((g) => g !== label);
      if (tier.id === tierId) {
        return { ...tier, gods: [...without, label] };
      }
      return { ...tier, gods: without };
    }),
  };
}

export function removeLabelFromAllTiers(state, label) {
  return {
    ...state,
    tiers: state.tiers.map((tier) => ({
      ...tier,
      gods: (tier.gods || []).filter((g) => g !== label),
    })),
  };
}

export function deleteTier(state, tierId) {
  return {
    ...state,
    tiers: state.tiers.filter((tier) => tier.id !== tierId),
  };
}

export function updateTier(state, tierId, patch) {
  return {
    ...state,
    tiers: state.tiers.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)),
  };
}

export function reorderTiers(state, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return state;
  const tiers = [...state.tiers];
  const fromIdx = tiers.findIndex((t) => t.id === fromId);
  const toIdx = tiers.findIndex((t) => t.id === toId);
  if (fromIdx < 0 || toIdx < 0) return state;
  const [moved] = tiers.splice(fromIdx, 1);
  tiers.splice(toIdx, 0, moved);
  return { ...state, tiers };
}

export function moveTierByOffset(state, tierId, offset) {
  const tiers = [...state.tiers];
  const idx = tiers.findIndex((t) => t.id === tierId);
  const next = idx + offset;
  if (idx < 0 || next < 0 || next >= tiers.length) return state;
  const [moved] = tiers.splice(idx, 1);
  tiers.splice(next, 0, moved);
  return { ...state, tiers };
}

const storage = {
  async getItem(key) {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
};

export async function loadEditorState(storageKey) {
  try {
    const raw = await storage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tiers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveEditorState(storageKey, state) {
  await storage.setItem(storageKey, JSON.stringify(state));
}
