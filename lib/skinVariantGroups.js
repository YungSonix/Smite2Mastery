/**
 * Saga/prism variant grouping + multi-form saga expansion (Dark Tyrant → separate form skins).
 * Mirror of scripts/skins-viewer/skinVariantGroups.js for the React Native app.
 */

function visibleVariants(skin) {
  return (skin?.variants || []).filter((v) => !/^Mastery Light$/i.test(String(v.name || '')));
}

function extractPrismCode(variant) {
  const tagName = variant?.loadoutMeta?.screenshotTag?.variantName;
  if (tagName) {
    const letter = String(tagName).match(/^Prism\s+([A-D])$/i);
    if (letter) return `Prism ${letter[1].toUpperCase()}`;
    const num = String(tagName).match(/^Prism\s+(\d+)$/i);
    if (num) return `Prism ${num[1]}`;
  }
  const path = variant?.icon || variant?.cardArt || variant?.skin || '';
  const fromFile = String(path).match(/Prisim_([A-D0-9]+)|_Prism0?(\d+)|_P(\d+)_/i);
  if (fromFile) {
    const raw = fromFile[1] || fromFile[2] || fromFile[3];
    if (/^[A-D]$/i.test(raw)) return `Prism ${raw.toUpperCase()}`;
    return `Prism ${raw}`;
  }
  return null;
}

function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function isSagaFormRow(variant) {
  const target = variant?.loadoutMeta?.screenshotTag?.target;
  if (target === 'variant-new') return true;
  const display = String(variant?.loadoutMeta?.displayName || variant?.name || '').trim();
  const name = String(variant?.name || '').trim();
  if (!display || display.includes(' - ')) return false;
  if (normalizeKey(display) !== normalizeKey(name)) return false;
  const tier = variant?.rarity || variant?.loadoutMeta?.rarity;
  return tier && !/^Prisms?$/i.test(String(tier));
}

const SAGA_FORM_KEYS = new Set(
  ['Galactic Commander', 'Outerworld Invader', 'Interstellar Empyrean'].map(normalizeKey)
);

function isKnownSagaFormName(formName) {
  return SAGA_FORM_KEYS.has(normalizeKey(formName));
}

function matchesParentSkin(formName, skin) {
  const parent = skin?.skinName || skin?.loadoutMeta?.displayName || skin?.skinKey || '';
  return normalizeKey(formName) === normalizeKey(parent);
}

function matchesSagaPrefix(prefix, skin) {
  if (matchesParentSkin(prefix, skin)) return true;
  const skinName = String(skin?.skinName || skin?.loadoutMeta?.displayName || skin?.skinKey || '').trim();
  if (!skinName) return false;
  const firstWord = skinName.split(/\s+/)[0] || '';
  const prefixKey = normalizeKey(prefix);
  if (prefixKey === normalizeKey(firstWord)) return true;
  return skinName.toLowerCase().startsWith(String(prefix).toLowerCase() + ' ');
}

function extractSagaFormName(variant, skin) {
  const display = String(variant?.loadoutMeta?.displayName || variant?.name || '').trim();
  const dash = display.indexOf(' - ');
  if (dash > 0) {
    const prefix = display.slice(0, dash).trim();
    const suffix = display.slice(dash + 3).trim();
    if (suffix && matchesSagaPrefix(prefix, skin)) return suffix;
  }
  return display;
}

function parseSimplePrismRow(variant, skin) {
  const display = String(variant?.loadoutMeta?.displayName || '').trim();
  const dash = display.indexOf(' - ');
  if (dash <= 0) return null;
  const parentPart = display.slice(0, dash).trim();
  const prismPart = display.slice(dash + 3).trim();
  if (!prismPart || !matchesSagaPrefix(parentPart, skin)) return null;
  return { prismName: prismPart };
}

function parseSagaPrismRow(variant) {
  const display = String(variant?.loadoutMeta?.displayName || '').trim();
  const dash = display.indexOf(' - ');
  if (dash > 0) {
    const formName = display.slice(0, dash).trim();
    const prismName = display.slice(dash + 3).trim();
    if (isKnownSagaFormName(formName)) {
      return { formName, prismName };
    }
  }
  const tagVariant = String(variant?.loadoutMeta?.screenshotTag?.variantName || '');
  const prefixes = [
    ['Galactic Commander', /^Galactic\s+/i],
    ['Outerworld Invader', /^Outerworld\s+/i],
    ['Interstellar Empyrean', /^Interstellar\s+/i],
  ];
  for (const [formName, re] of prefixes) {
    if (re.test(tagVariant) || re.test(variant?.name || '')) {
      const raw = tagVariant || variant?.name || '';
      return {
        formName,
        prismName: String(raw).replace(re, '').trim() || variant?.name || 'Prism',
      };
    }
  }
  return null;
}

function variantSortKey(v) {
  const code = extractPrismCode(v);
  const letter = code && code.match(/Prism\s+([A-D])/i);
  if (letter) return letter[1].charCodeAt(0);
  const num = code && code.match(/Prism\s+(\d+)/i);
  if (num) return 100 + parseInt(num[1], 10);
  return 999;
}

function sortFormsBySourceOrder(skin, forms) {
  const order = new Map();
  let idx = 0;
  for (const v of visibleVariants(skin)) {
    if (!isSagaFormRow(v)) continue;
    const formName = extractSagaFormName(v, skin);
    const key = normalizeKey(formName);
    if (!order.has(key)) order.set(key, idx++);
  }
  return [...forms].sort((a, b) => {
    const ai = order.get(normalizeKey(a.formName)) ?? 999;
    const bi = order.get(normalizeKey(b.formName)) ?? 999;
    return ai - bi;
  });
}

function extractFirstFlameDisplayName(skin) {
  const display = String(skin?.loadoutMeta?.displayName || '').trim();
  if (!/first flame/i.test(display)) return null;
  const dash = display.indexOf(' - ');
  return dash > 0 ? display.slice(dash + 3).trim() : display;
}

function progressionFormsFromGrouped(skin, forms) {
  return sortFormsBySourceOrder(skin, forms).map((f) => ({
    ...f.formEntry,
    name: f.formName,
    _prismDisplayName: f.formName,
    _sagaProgressionForm: true,
  }));
}

export function groupSkinVariants(skin) {
  if (skin?._sagaFormSkin) {
    const prisms = visibleVariants(skin).sort((a, b) => variantSortKey(a) - variantSortKey(b));
    return {
      hasSagaForms: false,
      hasProgressionForms: false,
      progressionForms: [],
      defaultPrisms: prisms,
      forms: [],
    };
  }

  if (skin?._progressionForms?.length) {
    return {
      hasSagaForms: false,
      hasProgressionForms: true,
      progressionForms: skin._progressionForms,
      defaultPrisms: visibleVariants(skin).sort((a, b) => variantSortKey(a) - variantSortKey(b)),
      forms: [],
    };
  }

  const variants = visibleVariants(skin);
  const formEntries = new Map();
  const formPrisms = new Map();
  const defaultPrisms = [];

  for (const v of variants) {
    if (isSagaFormRow(v)) {
      const formName = extractSagaFormName(v, skin);
      if (formName) formEntries.set(normalizeKey(formName), { formName, formEntry: v });
      continue;
    }

    const saga = parseSagaPrismRow(v);
    if (saga?.formName) {
      const key = normalizeKey(saga.formName);
      if (!formPrisms.has(key)) formPrisms.set(key, []);
      formPrisms.get(key).push({ ...v, _prismDisplayName: saga.prismName });
      continue;
    }

    const simple = parseSimplePrismRow(v, skin);
    if (simple?.prismName) {
      defaultPrisms.push({ ...v, _prismDisplayName: simple.prismName });
      continue;
    }

    defaultPrisms.push(v);
  }

  const formKeys = new Set([...formEntries.keys(), ...formPrisms.keys()]);
  if (!formKeys.size) {
    return {
      hasSagaForms: false,
      hasProgressionForms: false,
      progressionForms: [],
      defaultPrisms: defaultPrisms.sort((a, b) => variantSortKey(a) - variantSortKey(b)),
      forms: [],
    };
  }

  const forms = [];
  for (const key of formKeys) {
    const entry = formEntries.get(key);
    const prisms = (formPrisms.get(key) || []).sort((a, b) => variantSortKey(a) - variantSortKey(b));
    if (!entry && !prisms.length) continue;
    forms.push({
      formName: entry?.formName || prisms[0]?.loadoutMeta?.displayName?.split(' - ')[0] || key,
      formEntry: entry?.formEntry || null,
      prisms,
    });
  }

  if (forms.length === 1 && !forms[0].formEntry) {
    return {
      hasSagaForms: false,
      hasProgressionForms: false,
      progressionForms: [],
      defaultPrisms: [...defaultPrisms, ...forms[0].prisms].sort(
        (a, b) => variantSortKey(a) - variantSortKey(b)
      ),
      forms: [],
    };
  }

  const darkTyrant = forms.some((f) => (f.prisms || []).length > 0);
  if (forms.length >= 2 && !darkTyrant) {
    return {
      hasSagaForms: false,
      hasProgressionForms: true,
      progressionForms: progressionFormsFromGrouped(skin, forms),
      defaultPrisms: defaultPrisms.sort((a, b) => variantSortKey(a) - variantSortKey(b)),
      forms: [],
    };
  }

  return {
    hasSagaForms: forms.length > 0,
    hasProgressionForms: false,
    progressionForms: [],
    defaultPrisms,
    forms,
  };
}

function slugFormKey(formName) {
  return String(formName || '').replace(/[^a-zA-Z0-9]+/g, '');
}

function pickFormAssets(entry, prisms, parentSkin) {
  const p0 = prisms[0];
  const cardArt =
    entry?.cardArt ||
    entry?.skin ||
    p0?.cardArt ||
    p0?.skin ||
    parentSkin?.assets?.cardArt ||
    parentSkin?.cardArt;
  const icon = entry?.icon || p0?.icon || parentSkin?.assets?.icon || parentSkin?.icon;
  return {
    assets: {
      cardArt,
      skin: cardArt,
      icon,
      inGame: entry?.inGame || parentSkin?.assets?.inGame,
    },
    cardArt,
    skin: cardArt,
    icon,
  };
}

function isDarkTyrantStyle(grouped) {
  return grouped.forms.some((f) => (f.prisms || []).length > 0);
}

function skinFromSagaForm(parentSkin, form) {
  const entry = form.formEntry;
  const prisms = (form.prisms || []).map((v) => ({ ...v }));
  const body = entry || prisms[0] || {};
  const assets = pickFormAssets(entry, prisms, parentSkin);
  return {
    ...parentSkin,
    ...assets,
    skinKey: `${parentSkin.skinKey || parentSkin.key}:${slugFormKey(form.formName)}`,
    skinName: form.formName,
    name: form.formName,
    _sagaFormSkin: true,
    _sagaParentSkinKey: parentSkin.skinKey || parentSkin.key,
    _sagaParentSkinName: parentSkin.skinName || parentSkin.name,
    variants: prisms,
    isPrism: true,
    loadout: body.loadout ?? parentSkin.loadout,
    loadoutMeta: body.loadoutMeta ?? parentSkin.loadoutMeta,
    unlock: body.unlock ?? parentSkin.unlock,
    information: body.information ?? body.loadoutMeta?.information ?? parentSkin.information,
    rarity: body.rarity ?? parentSkin.rarity,
    tierBadge: body.tierBadge ?? parentSkin.tierBadge,
    type: body.type || parentSkin.type || 'Saga Form',
    cost: body.cost ?? parentSkin.cost,
    price: body.price ?? parentSkin.price,
  };
}

export function expandSagaFormSkins(skin) {
  const grouped = groupSkinVariants(skin);
  if (grouped.hasProgressionForms) {
    const displayName = extractFirstFlameDisplayName(skin) || skin.skinName || skin.name;
    return [
      {
        ...skin,
        skinName: displayName,
        name: displayName,
        variants: grouped.defaultPrisms.map((v) => ({ ...v })),
        _progressionForms: grouped.progressionForms.map((v) => ({ ...v })),
      },
    ];
  }
  if (!grouped.hasSagaForms || grouped.forms.length < 2) return [skin];

  const parentKey = skin.skinKey || skin.key;
  const parentSortName = skin.skinName || skin.name;
  const darkTyrant = isDarkTyrantStyle(grouped);
  const forms = sortFormsBySourceOrder(
    skin,
    grouped.forms.map((f) => ({ ...f, prisms: [...(f.prisms || [])] }))
  );

  const expanded = forms.map((form, i) => ({
    ...skinFromSagaForm(skin, form),
    _sagaFormOrder: i,
    _sagaParentSkinKey: parentKey,
    _sagaParentSortName: parentSortName,
  }));

  if (darkTyrant && grouped.defaultPrisms.length) {
    return [{ ...skin, variants: grouped.defaultPrisms, _sagaParentSkinKey: parentKey }, ...expanded];
  }

  return expanded;
}

export function compareSagaSkinsForDisplay(a, b) {
  const aSort = a?._sagaParentSortName || a?.skinName || a?.skinKey || '';
  const bSort = b?._sagaParentSortName || b?.skinName || b?.skinKey || '';
  const byParent = String(aSort).localeCompare(String(bSort), undefined, { sensitivity: 'base' });
  if (byParent !== 0) return byParent;
  const ao = a?._sagaFormOrder;
  const bo = b?._sagaFormOrder;
  if (ao != null && bo != null) return ao - bo;
  if (ao != null) return 1;
  if (bo != null) return -1;
  return String(a?.skinName || a?.skinKey || '').localeCompare(
    String(b?.skinName || b?.skinKey || ''),
    undefined,
    { sensitivity: 'base' }
  );
}

/** Expand builds-style `skins` map — replaces multi-form saga rows with one entry per form. */
export function expandGodSkinsRecord(skinsRecord) {
  if (!skinsRecord || typeof skinsRecord !== 'object') return skinsRecord;
  const out = {};
  for (const [key, skin] of Object.entries(skinsRecord)) {
    const rows = expandSagaFormSkins({ ...skin, skinKey: skin.skinKey || skin.key || key });
    if (rows.length === 1 && (rows[0].skinKey || key) === key) {
      out[key] = rows[0];
      continue;
    }
    for (const row of rows) {
      const outKey = row.skinKey || row.key || key;
      out[outKey] = row;
    }
  }
  return out;
}
