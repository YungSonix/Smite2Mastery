#!/usr/bin/env node
/**
 * Extract loadout metadata from `app/data/God Renders/{god}/` screenshots
 * and merge into `app/data/God Information/Skins/{Pantheon}.json`.
 *
 * Tier mapping: CLASSIC → Classic, PRISM → Prisms (see godRenderTiers.js).
 *
 *   node scripts/god-renders/extract-god-render-metadata.js --god achilles
 *   node scripts/god-renders/extract-god-render-metadata.js --god achilles --write
 *   node scripts/god-renders/extract-god-render-metadata.js --all
 */
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, SKINS_DIR, BUILDS_JSON } = require('../../config/dataPaths');
const { extractGodRenderScreenshot } = require('./lib/godRenderExtract');
const { shutdownOcr } = require('./lib/godRenderOcr');
const { promoteMasteryShadowInGodSkinsArray, removeMasteryLightInGodSkinsArray } = require('../lib/godSkinsPaths');
const {
  buildScreenshotTag,
  attachScreenshotTag,
  mergeGodScreenshotMap,
} = require('./lib/godRenderScreenshotTags');
const { informationSetsCrossGen } = require('./lib/godRenderSkinInformation');
const { godNameFromRenderFolder } = require('./lib/godRenderFolderAliases');

const RENDERS_ROOT = path.join(PROJECT_ROOT, 'app', 'data', 'God Renders');

function resolveGodNameFromRenderFolder(folderName, builds) {
  const buildsGod = findGodInBuilds(folderName, builds);
  return godNameFromRenderFolder(folderName, () => buildsGod?.name || titleCaseWords(folderName));
}

function parseArgs(argv) {
  const args = { god: null, all: false, write: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--write') args.write = true;
    else if (a === '--all') args.all = true;
    else if (a === '--god' && argv[i + 1]) args.god = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function titleCaseWords(s) {
  return String(s || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function findGodInBuilds(godFolderName, builds) {
  const hint = normalizeKey(godFolderName);
  const gods = builds.gods || [];
  return gods.find((g) => {
    const n = normalizeKey(g.name || g.godName);
    return n === hint || n.includes(hint) || hint.includes(n);
  });
}

function findPantheonFileForGod(godName) {
  const files = fs.readdirSync(SKINS_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const target = normalizeKey(godName);
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(SKINS_DIR, file), 'utf8'));
    const hit = (data.gods || []).find((g) => normalizeKey(g.godName) === target);
    if (hit) return { file, data, god: hit };
  }
  return null;
}

function normalizeCostAmount(extracted) {
  return extracted?.cost?.amount != null ? String(extracted.cost.amount) : null;
}

/** Prism / multi-variant skins show a carousel on their loadout tab — not on the base god grid. */
function isPremiumSkinLoadoutPage(extracted, skin) {
  if (!skin || skin.isBaseSkin) return true;
  if (
    skin.isMasteryShadowSkin ||
    normalizeKey(skin.skinKey) === 'shadow' ||
    /^shadow$/i.test(String(skin.skinName || '').trim())
  ) {
    return true;
  }
  if (extracted.variantName) return true;
  if (extracted.matchSkinKey && !extracted.matchVariantName) {
    const key = normalizeKey(extracted.matchSkinKey);
    if (normalizeKey(skin.skinKey) === key) return true;
  }
  if (skin.isPrism || (skin.variants && skin.variants.length > 0)) {
    return Boolean(extracted.carousel);
  }
  const skinCost = skin.cost?.amount || skin.price?.diamonds;
  const extCost = normalizeCostAmount(extracted);
  if (skinCost && extCost && String(skinCost) !== extCost) return false;
  return true;
}

/** Base-grid shots mis-tagged as Soul Piercer (no carousel, wrong cost) → mastery Shadow. */
function rerouteMisassignedExtraction(extracted) {
  if (extracted.carousel || extracted.variantName) return extracted;
  const cost = normalizeCostAmount(extracted);
  const disp = String(extracted.displayName || '').trim();
  if (/^Soul Piercer$/i.test(disp) && cost !== '2400') {
    return { ...extracted, displayName: 'Shadow', parentSkinName: null, variantName: null };
  }
  // Base loadout grid (no carousel): slot 1 without 2400 cost is usually a mastery preview, not Soul Piercer
  if (
    extracted.grid?.selectedIndex === 1 &&
    cost !== '2400' &&
    !extracted.unlock?.masteryRank &&
    (disp.length < 3 || /^Soul Piercer$/i.test(disp))
  ) {
    return { ...extracted, displayName: 'Shadow', parentSkinName: null, variantName: null };
  }
  return extracted;
}

function variantScreenshot(entry) {
  return entry?.loadout?.screenshot || entry?.loadoutMeta?.screenshot || entry?.screenshot || null;
}

/** Prism P1 / Prism 1 / Prism P2 → 0-based slot (parent carousel slot 1 is the skin row, not a variant). */
function prismSlotIndexFromLabel(label) {
  if (!label) return null;
  const m = String(label).trim().match(/^prism\s*p?(\d+)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n - 1 : null;
}

function findVariantRow(skin, extracted) {
  const variants = skin.variants || [];
  const matchName = extracted.matchVariantName;
  const shot = variantScreenshot(extracted);

  if (matchName) {
    const byName = variants.find((v) => normalizeKey(v.name) === normalizeKey(matchName));
    if (byName) return byName;

    const slot = prismSlotIndexFromLabel(matchName);
    if (slot != null && slot >= 0 && slot < variants.length) {
      const bySlot = variants[slot];
      if (bySlot) return bySlot;
    }
  }

  if (shot) {
    const byShot = variants.find((v) => variantScreenshot(v) === shot);
    if (byShot) return byShot;
  }

  return null;
}

function findSkinEntry(god, extracted) {
  const skins = god.skins || [];
  const disp = extracted.displayName;
  const parent = extracted.parentSkinName;
  const variant = extracted.variantName;
  const carousel = extracted.carousel;

  if (extracted.matchSkinKey) {
    const forced = skins.find((s) => normalizeKey(s.skinKey) === normalizeKey(extracted.matchSkinKey));
    if (forced) {
      if (extracted.matchVariantName) {
        const variantRow = findVariantRow(forced, extracted);
        return {
          skin: forced,
          variant: variantRow,
          target: variantRow ? 'variant' : 'variant-new',
          variantName: extracted.matchVariantName,
        };
      }
      return { skin: forced, variant: null, target: 'skin' };
    }
  }

  if (/^base$/i.test(disp) || extracted.ocr?.skinNameRaw?.toUpperCase().includes('DEFAULT')) {
    return { skin: skins.find((s) => s.isBaseSkin) || skins[0], variant: null, target: 'skin' };
  }

  const masteryVariantNames = ['onyx', 'opal', 'radiant'];
  let mKey = normalizeKey(disp);
  if (mKey === 'light') mKey = 'radiant';
  if (mKey === 'shadow') {
    const shadowSkin = skins.find(
      (s) =>
        !s.isBaseSkin &&
        (s.isMasteryShadowSkin ||
          normalizeKey(s.skinKey) === 'shadow' ||
          /^shadow$/i.test(String(s.skinName || '').trim()))
    );
    if (shadowSkin) return { skin: shadowSkin, variant: null, target: 'skin' };
  }
  if (masteryVariantNames.includes(mKey)) {
    const base = skins.find((s) => s.isBaseSkin);
    if (base) {
      const tierLabel = mKey.charAt(0).toUpperCase() + mKey.slice(1);
      const vName = `Mastery ${tierLabel}`;
      const variantRow = (base.variants || []).find(
        (v) => normalizeKey(v.name) === normalizeKey(vName) || normalizeKey(v.name).includes(mKey)
      );
      return { skin: base, variant: variantRow, target: 'variant', variantName: vName };
    }
  }

  const parentSkin = skins.find(
    (s) =>
      normalizeKey(s.skinName) === normalizeKey(parent || disp) ||
      normalizeKey(s.skinKey) === normalizeKey(parent || disp) ||
      (parent && normalizeKey(s.skinName) === normalizeKey(parent))
  );

  if (variant && parentSkin) {
    let variantRow = (parentSkin.variants || []).find(
      (v) => normalizeKey(v.name) === normalizeKey(variant) || normalizeKey(v.name).includes(normalizeKey(variant))
    );
    if (!variantRow && carousel && carousel.index > 1) {
      variantRow = (parentSkin.variants || [])[carousel.index - 2];
    }
    if (variantRow && /^prism\s*\d+$/i.test(String(variantRow.name || '')) && variant.length > 3) {
      variantRow.name = variant;
    }
    return {
      skin: parentSkin,
      variant: variantRow,
      target: variantRow ? 'variant' : 'variant-new',
      variantName: variant,
    };
  }

  if (parentSkin && !variant && carousel && carousel.index > 1) {
    const variantRow = (parentSkin.variants || [])[carousel.index - 2];
    return {
      skin: parentSkin,
      variant: variantRow,
      target: variantRow ? 'variant' : 'variant-new',
      variantName: extracted.displayName,
    };
  }

  const direct = skins.find(
    (s) =>
      normalizeKey(s.skinName) === normalizeKey(disp) ||
      normalizeKey(s.skinName) === normalizeKey(parent) ||
      normalizeKey(s.skinKey) === normalizeKey(parent || disp)
  );
  if (direct) {
    if (!isPremiumSkinLoadoutPage(extracted, direct)) return null;
    return { skin: direct, variant: null, target: 'skin' };
  }

  return null;
}

function applyInformationFields(entry, extracted) {
  if (!extracted?.information?.length) return;
  entry.information = extracted.information.map((row) => ({ ...row }));
  if (entry.loadoutMeta) {
    entry.loadoutMeta.information = entry.information;
  }
  if (informationSetsCrossGen(extracted.information)) {
    entry.isCrossGen = true;
  }
}

/** Panel title for premium parent skins (not prisms / saga sub-forms with " - "). */
function applyPanelSkinName(skin, extracted) {
  const dn = String(extracted.displayName || '').trim();
  if (!dn || dn === 'Base' || dn.includes(' - ')) return;
  if (/^(onyx|opal|radiant|shadow)$/i.test(dn)) return;
  skin.skinName = dn;
}

/** Achilles-style prism names: "Soul Piercer - Veil Strider" → "Veil Strider". */
function variantNameFromPanelDisplayName(displayName, fallbackName) {
  const fb = String(fallbackName || '').trim();
  const dn = String(displayName || '').trim();
  if (/^Mastery (Onyx|Opal|Radiant)$/i.test(fb)) return fb;
  const dash = dn.indexOf(' - ');
  if (dash >= 0) {
    const suffix = dn.slice(dash + 3).trim();
    if (suffix) return suffix;
  }
  if (dn && !/^(onyx|opal|radiant|shadow|base)$/i.test(dn)) return dn;
  return fb || dn;
}

function sanitizeMasteryVariantUnlock(variant) {
  if (!variant?.unlock || !/^Mastery /i.test(variant.name || '')) return;
  delete variant.unlock.prismNote;
  if (variant.unlock.source === 'event' && variant.unlock.requiresAscensionPass) {
    variant.unlock.source = 'ascension';
  }
}

function applyExtractedToSkin(skin, extracted, matchMeta) {
  if (!isPremiumSkinLoadoutPage(extracted, skin)) return;

  const screenshotTag = matchMeta?.screenshotTag || null;
  skin.loadout = extracted.loadout;
  skin.loadoutMeta = attachScreenshotTag(
    {
      godName: extracted.godName,
      displayName: extracted.displayName,
      rarity: extracted.tier || null,
      gridBadge: extracted.grid?.badge || null,
      screenshot: extracted.screenshot,
      extractedAt: new Date().toISOString().slice(0, 10),
      ...(extracted.buttonText ? { buttonText: extracted.buttonText } : {}),
    },
    screenshotTag
  );

  if (skin.isBaseSkin) {
    skin.cost = { currency: 'diamonds', amount: '0' };
    skin.price = { diamonds: '0' };
    skin.rarity = null;
    delete skin.tierBadge;
    skin.unlock = extracted.unlock || { source: 'base', displayText: 'Base god' };
    return;
  }

  applyPanelSkinName(skin, extracted);

  if (extracted.tier) {
    skin.rarity = extracted.tier;
    skin.tierBadge = extracted.tierBadge || skin.tierBadge;
  }
  if (extracted.cost && extracted.cost.amount != null && !extracted.cost.navigateOnly) {
    const next = Number(extracted.cost.amount);
    if (Number.isFinite(next)) {
      // Vision-tagged loadouts are authoritative — always overwrite stale OCR/list prices.
      skin.cost = { currency: extracted.cost.currency || 'diamonds', amount: String(next) };
      skin.price = { diamonds: String(next) };
    }
  }
  if (extracted.tier === 'Prisms' || extracted.unlock?.prismNote) {
    skin.isPrism = true;
  }
  if (extracted.unlock) {
    const merged = { ...(skin.unlock || {}), ...extracted.unlock };
    if (skin.isMasteryShadowSkin) {
      delete merged.masteryRank;
      delete merged.masteryEmblem;
      if (merged.source === 'event' && merged.requiresAscensionPass) {
        merged.source = 'ascension';
      }
    }
    skin.unlock = merged;
  }

  if (skin.isMasteryShadowSkin && skin.loadoutMeta?.gridBadge?.type === 'masteryRank') {
    skin.loadoutMeta.gridBadge = null;
  }
  if (skin.isMasteryShadowSkin && skin.unlock) {
    if (skin.unlock.rarityNote === 'Rare' && skin.unlock.requiresAscensionPass) {
      skin.unlock.displayText = 'Ascension Pass — rare skin (may appear in events)';
    } else if (skin.unlock.requiresAscensionPass) {
      skin.unlock.displayText = 'Unlocked with Ascension Pass';
    }
  }
  applyInformationFields(skin, extracted);
}

function applyExtractedToVariant(variant, extracted, variantDisplayName, matchMeta) {
  const panelName = variantNameFromPanelDisplayName(extracted.displayName, variantDisplayName);
  if (panelName) variant.name = panelName;
  const screenshotTag = matchMeta?.screenshotTag || null;
  variant.loadout = extracted.loadout;
  variant.loadoutMeta = attachScreenshotTag(
    {
      godName: extracted.godName,
      displayName: extracted.displayName,
      rarity: extracted.tier || variant.rarity || null,
      gridBadge: extracted.grid?.badge || null,
      screenshot: extracted.screenshot,
      extractedAt: new Date().toISOString().slice(0, 10),
      ...(extracted.buttonText ? { buttonText: extracted.buttonText } : {}),
    },
    screenshotTag
  );
  if (extracted.tier) {
    variant.rarity = extracted.tier;
    variant.tierBadge = extracted.tierBadge || variant.tierBadge;
  } else if (extracted.unlock?.requiresAscensionPass) {
    variant.rarity = 'Heroic';
    variant.tierBadge = 'app/data/Tiers/t_FE_Cosmetics_HeroicTier.png';
  }
  if (extracted.unlock) variant.unlock = { ...(variant.unlock || {}), ...extracted.unlock };
  sanitizeMasteryVariantUnlock(variant);
  if (!variant.loadoutMeta.gridBadge && variant.unlock?.masteryRank) {
    variant.loadoutMeta.gridBadge = {
      type: 'masteryRank',
      rank: variant.unlock.masteryRank,
      label: variant.unlock.masteryRank === 10 ? 'X' : 'V',
      emblemPath: variant.unlock.masteryEmblem || null,
    };
  }
  if (!variant.rarity && extracted.variantName && extracted.parentSkinName) {
    variant.rarity = 'Prisms';
    variant.tierBadge = 'app/data/Tiers/t_FE_Cosmetics_RecolorsTier.png';
    variant.unlock = {
      ...(variant.unlock || {}),
      prismNote: true,
      source: 'prism',
      displayText: 'Prism variant',
    };
    variant.loadoutMeta.rarity = 'Prisms';
    if (!variant.loadoutMeta.gridBadge) {
      variant.loadoutMeta.gridBadge = { type: 'prism', rank: null, label: 'prism' };
    }
  }
  applyInformationFields(variant, extracted);
}

function mergeExtractionsIntoGod(god, extractions) {
  const report = [];
  const screenshotTags = [];
  for (const raw of extractions) {
    const extracted = rerouteMisassignedExtraction(raw);
    const match = findSkinEntry(god, extracted);
    const screenshotTag = buildScreenshotTag(extracted, match, god);
    if (screenshotTag.fileName) screenshotTags.push(screenshotTag);

    if (!match?.skin) {
      report.push({ ok: false, extracted, screenshotTag, reason: 'no matching skin row' });
      continue;
    }

    if (match.target === 'skin') {
      applyExtractedToSkin(match.skin, extracted, { screenshotTag });
      report.push({ ok: true, extracted, screenshotTag, appliedTo: match.skin.skinName });
      continue;
    }

    if (match.target === 'variant' && match.variant) {
      applyExtractedToVariant(
        match.variant,
        extracted,
        variantNameFromPanelDisplayName(extracted.displayName, match.variant.name),
        { screenshotTag }
      );
      report.push({
        ok: true,
        extracted,
        screenshotTag,
        appliedTo: `${match.skin.skinName} → ${match.variant.name}`,
      });
      continue;
    }

    if (match.target === 'variant-new') {
      if (!match.skin.variants) match.skin.variants = [];
      const shot = variantScreenshot(extracted);
      if (shot) {
        const byShot = match.skin.variants.find((x) => variantScreenshot(x) === shot);
        if (byShot) {
          applyExtractedToVariant(
            byShot,
            extracted,
            variantNameFromPanelDisplayName(extracted.displayName, byShot.name),
            { screenshotTag }
          );
          report.push({
            ok: true,
            extracted,
            screenshotTag,
            appliedTo: `${match.skin.skinName} → ${byShot.name}`,
          });
          continue;
        }
      }
      let v = match.skin.variants.find((x) => normalizeKey(x.name) === normalizeKey(match.variantName));
      if (!v && extracted.matchVariantName) {
        v = findVariantRow(match.skin, extracted);
      }
      if (!v) {
        v = { name: match.variantName };
        match.skin.variants.push(v);
      }
      applyExtractedToVariant(v, extracted, match.variantName, { screenshotTag });
      report.push({
        ok: true,
        extracted,
        screenshotTag,
        appliedTo: `${match.skin.skinName} → ${match.variantName}`,
      });
      continue;
    }

    if (match.target === 'variant' && !match.variant) {
      if (!match.skin.variants) match.skin.variants = [];
      const vName = match.variantName || extracted.displayName;
      const shot = variantScreenshot(extracted);
      let v =
        (shot && match.skin.variants.find((x) => variantScreenshot(x) === shot)) ||
        findVariantRow(match.skin, extracted) ||
        match.skin.variants.find((x) => normalizeKey(x.name) === normalizeKey(vName));
      if (!v) {
        v = { name: vName };
        match.skin.variants.push(v);
      }
      applyExtractedToVariant(v, extracted, vName, { screenshotTag });
      report.push({
        ok: true,
        extracted,
        screenshotTag,
        appliedTo: `${match.skin.skinName} → ${vName}`,
      });
    }
  }
  return { report, screenshotTags };
}

async function processGodFolder(folderName) {
  const folderPath = path.join(RENDERS_ROOT, folderName);
  if (!fs.statSync(folderPath).isDirectory()) throw new Error(`Not a folder: ${folderPath}`);

  const builds = JSON.parse(fs.readFileSync(BUILDS_JSON, 'utf8'));
  const godName = resolveGodNameFromRenderFolder(folderName, builds);
  const pantheonHit = findPantheonFileForGod(godName);
  if (!pantheonHit) throw new Error(`God "${godName}" not found in ${SKINS_DIR}`);

  const shots = fs
    .readdirSync(folderPath)
    .filter((f) => /\.png$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const extractions = [];
  for (const file of shots) {
    const abs = path.join(folderPath, file);
    const row = await extractGodRenderScreenshot(abs, PROJECT_ROOT, { godNameHint: godName });
    extractions.push(row);
  }

  const godIdx = pantheonHit.data.gods.findIndex((g) => normalizeKey(g.godName) === normalizeKey(godName));
  const god = pantheonHit.data.gods[godIdx];

  for (const skin of god.skins || []) {
    if (skin.isBaseSkin) {
      skin.rarity = null;
      skin.isPrism = false;
      delete skin.tierBadge;
      delete skin.unlock;
    }
  }

  promoteMasteryShadowInGodSkinsArray(god);
  removeMasteryLightInGodSkinsArray(god);

  const { report, screenshotTags } = mergeExtractionsIntoGod(god, extractions);

  if (god.skins) {
    for (const skin of god.skins) {
      if (!skin.variants) continue;
      skin.variants = skin.variants.filter((v) => {
        if (v.cardArt || v.icon || v.skin) return true;
        if (/^prism\s*\d+$/i.test(String(v.name || ''))) return true;
        if (/^mastery\s+/i.test(String(v.name || ''))) return true;
        return false;
      });
    }
  }

  promoteMasteryShadowInGodSkinsArray(god);
  removeMasteryLightInGodSkinsArray(god);

  return {
    folderName,
    godName,
    pantheonFile: pantheonHit.file,
    pantheonData: pantheonHit.data,
    godIdx,
    extractions,
    report,
    screenshotTags,
  };
}

function listGodFolders() {
  if (!fs.existsSync(RENDERS_ROOT)) return [];
  return fs
    .readdirSync(RENDERS_ROOT)
    .filter((name) => {
      const p = path.join(RENDERS_ROOT, name);
      return fs.statSync(p).isDirectory();
    })
    .sort((a, b) => a.localeCompare(b));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage:
  node scripts/god-renders/extract-god-render-metadata.js --god achilles [--write]
  node scripts/god-renders/extract-god-render-metadata.js --all [--write]`);
    process.exit(0);
  }

  const folders = args.all ? listGodFolders() : args.god ? [args.god] : [];
  if (!folders.length) {
    console.error('Pass --god <folder> or --all');
    process.exit(1);
  }

  const results = [];
  const mapPath = path.join(SKINS_DIR, '_godRenderScreenshotMap.json');
  let screenshotGods = {};
  if (fs.existsSync(mapPath)) {
    try {
      screenshotGods = JSON.parse(fs.readFileSync(mapPath, 'utf8')).gods || {};
    } catch {
      screenshotGods = {};
    }
  }
  for (const folder of folders) {
    try {
      const result = await processGodFolder(folder);
      results.push(result);

      console.log(`\n=== ${result.godName} (${result.folderName}) → ${result.pantheonFile} ===`);
      for (const row of result.report) {
        const e = row.extracted;
        const tier = e.tier || '?';
        const cost = e.cost?.amount != null ? e.cost.amount : e.cost?.navigateOnly ? 'GO TO' : '—';
        const line = `${row.ok ? '✓' : '✗'} ${e.displayName} · tier ${tier} · cost ${cost}`;
        console.log(row.ok ? line : `${line} (${row.reason})`);
      }

      if (args.write) {
        const outPath = path.join(SKINS_DIR, result.pantheonFile);
        fs.writeFileSync(outPath, JSON.stringify(result.pantheonData, null, 2) + '\n', 'utf8');
        console.log(`Wrote ${outPath}`);
      }

      screenshotGods = mergeGodScreenshotMap(
        screenshotGods,
        result.folderName,
        result.screenshotTags || []
      );
    } catch (err) {
      console.error(`Failed ${folder}:`, err.message);
    }
  }

  await shutdownOcr();

  fs.writeFileSync(
    mapPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), gods: screenshotGods }, null, 2) + '\n',
    'utf8'
  );
  console.log(`Wrote screenshot map ${mapPath}`);

  const outJson = path.join(SKINS_DIR, '_godRendersExtracted.json');
  fs.writeFileSync(
    outJson,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        results: results.map((r) => ({
          godName: r.godName,
          folder: r.folderName,
          pantheon: r.pantheonFile,
          extractions: r.extractions,
          report: r.report,
        })),
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
  console.log(`\nAudit log → ${outJson}`);
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error(err);
    await shutdownOcr();
    process.exit(1);
  });
}

module.exports = {
  normalizeKey,
  findSkinEntry,
  applyExtractedToSkin,
  applyExtractedToVariant,
  mergeExtractionsIntoGod,
  rerouteMisassignedExtraction,
  findPantheonFileForGod,
  titleCaseWords,
  promoteMasteryShadowInGodSkinsArray,
  removeMasteryLightInGodSkinsArray,
};
