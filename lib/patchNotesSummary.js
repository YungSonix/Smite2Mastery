/**
 * Build Patch Hub Simple Summary from patch JSON + curated highlights.
 * Highlights control grid membership; patch JSON supplies tooltip change detail.
 *
 * Bucket taxonomy (auto-infer + manual highlights):
 * - Buff: stats added / values increased (damage, heal, protections, etc.)
 * - Nerf: stats removed / values decreased; cooldown & mana cost UP = nerf
 * - Shifted: mixed buff + nerf on same entry (playstyle/build path change)
 * - Adjusted: numeric tweaks, reenabled, fixes; effect-only reworks map here until a Rework grid exists
 * - Rework (detected): major ability/system overhaul — surfaced as adjusted in the grid
 *
 * Cooldown increased = nerf. Cooldown reduced = buff.
 * Ability mana cost increased = nerf. Max mana (pool) increased = buff.
 */

/** God/item pool stats — higher is better (not ability cast costs). */
const MANA_POOL_STAT = /\bmax\s+mana\b/i;

/** Ability cast costs and item gold cost — higher is worse. */
const STAT_WORSE_WHEN_HIGHER =
  /\b(cooldown|mana\s*cost|resource\s*cost|energy\s*cost|channel(?:ing)?\s*time|cast\s*time|cost)\b/i;

/** Patch lines that say "mana" without "cost" usually mean ability mana cost, not max mana. */
function isAbilityManaCostLine(s) {
  return (
    /\bmana\b/.test(s) &&
    !MANA_POOL_STAT.test(s) &&
    !/\bmana\s*regen\b/.test(s) &&
    !/\bmana\s*per\s+stack\b/.test(s) &&
    !/\bmana\s*infusion\b/.test(s)
  );
}

/** Self-inflicted harm — higher is worse (rare in notes; extend when more examples appear). */
const SELF_HARM_WORSE_WHEN_HIGHER = /\b(?:self[- ]?)?damage\s+taken\b/i;

function isStatWorseWhenHigher(s) {
  if (MANA_POOL_STAT.test(s)) return false;
  if (STAT_WORSE_WHEN_HIGHER.test(s)) return true;
  if (isAbilityManaCostLine(s)) return true;
  if (SELF_HARM_WORSE_WHEN_HIGHER.test(s)) return true;
  return false;
}

function isStatBetterWhenHigher(s) {
  if (MANA_POOL_STAT.test(s)) return true;
  return false;
}

function findSection(sections, matcher) {
  if (!Array.isArray(sections)) return null;
  return sections.find((s) => {
    const t = (s.title || '').toLowerCase();
    return typeof matcher === 'string' ? t.includes(matcher.toLowerCase()) : matcher(t);
  });
}

function collectLines(items, out = []) {
  if (!items) return out;
  for (const item of items) {
    if (item.text) out.push(item.text);
    if (item.items) collectLines(item.items, out);
  }
  return out;
}

function normalizeAbilityLabel(text) {
  if (!text) return 'General';
  return text
    .replace(/^Ability\s+\d+:\s*/i, '')
    .replace(/^Ultimate Ability(?:\s*\(Aspect\))?:\s*/i, '')
    .replace(/^Passive:?\s*/i, '')
    .replace(/^Passive\s+/i, '')
    .replace(/[\u2018\u2019\u201B`´]/g, "'")
    .replace(/\u2013|\u2014/g, '-')
    .trim();
}

function parseListToAbilityChanges(items) {
  const changes = [];
  if (!items) return changes;

  for (const item of items) {
    const label = item.text || '';
    const childItems = item.items || [];
    const nestedAbilities = childItems.filter((c) => c.items && c.text);

    if (nestedAbilities.length > 0 && (label === 'General' || label.includes('Aspect'))) {
      if (label.includes('Aspect')) {
        const lines = childItems
          .filter((c) => !(c.items && c.items.length && c.text))
          .map((c) => c.text)
          .filter(Boolean);
        const subAbilities = [];
        for (const nested of nestedAbilities) {
          const nestedLabel = nested.text || '';
          const childLines = collectLines(nested.items, []);
          if (isAspectLabelLine(nestedLabel)) {
            lines.push(nestedLabel, ...childLines);
          } else {
            subAbilities.push({
              ability: normalizeAbilityLabel(nestedLabel) || nestedLabel,
              lines: childLines,
            });
          }
        }
        changes.push({
          ability: label,
          lines,
          ...(subAbilities.length ? { subAbilities } : {}),
          scope: 'aspect',
        });
      } else {
        for (const nested of nestedAbilities) {
          const nestedLabel = nested.text || '';
          const childLines = collectLines(nested.items, []);
          const lines = isAspectLabelLine(nestedLabel) ? [nestedLabel, ...childLines] : childLines;
          changes.push({
            ability: label === 'General' ? 'General' : normalizeAbilityLabel(nestedLabel) || nestedLabel,
            lines,
          });
        }
        const plain = childItems.filter((c) => !c.items || !c.text).map((c) => c.text).filter(Boolean);
        if (plain.length) {
          changes.push({ ability: label, lines: plain });
        }
      }
    } else if (childItems.length) {
      const lines = collectLines(childItems, []);
      if (lines.length) {
        changes.push({ ability: normalizeAbilityLabel(label) || label, lines });
      }
    } else if (label) {
      changes.push({ ability: 'General', lines: [label] });
    }
  }
  return changes;
}

function parseContentBlocksToChanges(content) {
  const changes = [];
  if (!content) return changes;
  for (const block of content) {
    if (block.type === 'list') {
      changes.push(...parseListToAbilityChanges(block.items));
    } else if (block.type === 'paragraph' && block.text) {
      changes.push({ ability: 'General', lines: [block.text] });
    }
  }
  return changes;
}

function isGodNameParagraph(text) {
  if (!text || text.length > 40) return false;
  if (/^base stat changes$/i.test(text.trim())) return false;
  if (text.includes('.') && text.split(' ').length > 4) return false;
  return /^[A-Z]/.test(text) && !text.toLowerCase().includes('while we');
}

function normalizeLookupKey(text) {
  return String(text || '')
    .replace(/[\u2018\u2019\u201B`´]/g, "'")
    .trim();
}

function classifyChangeLine(line) {
  if (!line || isAspectLabelLine(line)) return null;
  const s = String(line).toLowerCase();
  const increased = /\bincreased\b/.test(s);
  const decreased = /\b(reduced|decreased|lowered)\b/.test(s);

  if (increased || decreased) {
    if (isStatWorseWhenHigher(s)) {
      if (increased) return 'nerf';
      if (decreased) return 'buff';
    }
    if (isStatBetterWhenHigher(s)) {
      if (increased) return 'buff';
      if (decreased) return 'nerf';
    }
    if (increased) return 'buff';
    if (decreased) return 'nerf';
  }

  if (
    /\b(?:stats?\s+added|now (?:also )?(?:grants?|gains?|provides?))\b/.test(s) &&
    !/\b(removed|no longer|shared|called)\b/.test(s)
  ) {
    return 'buff';
  }
  if (/\b(removed|no longer grants?|no longer gains?)\b/.test(s)) return 'nerf';

  if (/\b(rework(?:ed)?|overhaul(?:ed)?|redesigned|redesign(?:ed)?)\b/.test(s)) return 'rework';
  if (
    /\b(is now|now fires|now applies|now deals|instead of|replaced with|works differently)\b/.test(s) &&
    !increased &&
    !decreased
  ) {
    return 'rework';
  }

  if (/\b(reenabled|fix(?:ed)?|adjusted)\b/.test(s)) return 'adjust';

  return null;
}

function inferBucketFromLines(lines) {
  let hasBuff = false;
  let hasNerf = false;
  let hasRework = false;
  let hasAdjust = false;

  for (const line of lines || []) {
    const kind = classifyChangeLine(line);
    if (kind === 'buff') hasBuff = true;
    else if (kind === 'nerf') hasNerf = true;
    else if (kind === 'rework') hasRework = true;
    else if (kind === 'adjust') hasAdjust = true;
  }

  if (hasBuff && hasNerf) return 'shifted';
  // Reenabled/readjusted + tuning nerfs (no buffs) = ADJUSTED — e.g. Atlas aspect readjust.
  if (hasNerf && hasAdjust && !hasBuff) return 'adjusted';
  if (hasNerf) return 'nerfed';
  if (hasBuff) return 'buffed';
  if (hasRework || hasAdjust) return 'adjusted';
  return 'adjusted';
}

function inferBucketFromChanges(changes) {
  const lines = (changes || []).flatMap((c) => c.lines || []);
  return inferBucketFromLines(lines);
}

function inferGodBucket(lines) {
  return inferBucketFromLines(lines);
}

function parseGodBalanceSection(section) {
  const byGod = new Map();
  if (!section?.content) return { introNote: null, globalNotes: [], gods: {} };

  let currentGod = null;
  let introNote = null;
  const globalNotes = [];

  for (const block of section.content) {
    if (block.type === 'paragraph') {
      const text = block.text?.trim();
      if (!text) continue;
      if (/^base stat changes$/i.test(text)) {
        currentGod = null;
        introNote = introNote || text;
        continue;
      }
      if (isGodNameParagraph(text)) {
        currentGod = text;
        if (!byGod.has(currentGod)) byGod.set(currentGod, []);
      } else if (!currentGod) {
        introNote = introNote ? `${introNote} ${text}` : text;
      }
    } else if (block.type === 'list' && currentGod) {
      const parsed = parseListToAbilityChanges(block.items);
      byGod.get(currentGod).push(...parsed);
    } else if (block.type === 'list' && !currentGod) {
      globalNotes.push(...collectLines(block.items, []));
    }
  }

  // Style B: bold "Name (Buff)" list entries
  for (const block of section.content || []) {
    if (block.type !== 'list') continue;
    for (const item of block.items || []) {
      const m = (item.text || '').match(/^(.+?)\s*\(([^)]+)\)\s*$/i);
      if (!m || !item.bold) continue;
      const name = m[1].trim();
      const tag = m[2].toLowerCase();
      const changes = parseListToAbilityChanges(item.items);
      byGod.set(name, changes);
      byGod.set(`${name}__tag`, tag);
    }
  }

  const result = { introNote, globalNotes, gods: {} };
  for (const [key, changes] of byGod.entries()) {
    if (key.endsWith('__tag')) continue;
    const tag = byGod.get(`${key}__tag`);
    const lines = changes.flatMap((c) => c.lines);
    let bucket = 'adjusted';
    if (tag) {
      if (tag.includes('nerf')) bucket = 'nerfed';
      else if (tag.includes('buff')) bucket = 'buffed';
      else if (tag.includes('shift') || tag.includes('fix')) bucket = 'adjusted';
    } else {
      bucket = inferGodBucket(lines);
    }
    result.gods[key] = { name: key, bucket, changes };
  }
  return result;
}

function parseNewGodsSection(section) {
  const gods = [];
  for (const sub of section?.subsections || []) {
    gods.push({
      name: sub.title,
      changes: parseContentBlocksToChanges(sub.content),
    });
  }
  return gods;
}

function parseWanderingMarketSection(section) {
  return (section?.subsections || []).map((sub) => {
    const unlocks = [];
    for (const block of sub.content || []) {
      if (block.type === 'list') collectLines(block.items, unlocks);
    }
    return {
      title: sub.title,
      god: sub.title.split(':').pop()?.trim() || sub.title,
      premiumUnlocks: unlocks.filter((u) => !u.toLowerCase().includes('instantly unlocked')),
    };
  });
}

function parseGameModesSection(section) {
  return (section?.subsections || []).map((sub) => ({
    name: sub.title,
    changes: parseContentBlocksToChanges(sub.content),
  }));
}

function parseItemBalanceSection(section) {
  const items = new Map();

  const ingestBlocks = (blocks) => {
    let currentKey = null;
    for (const block of blocks || []) {
      if (block.type === 'paragraph') {
        const text = block.text?.trim();
        if (!text || text.length > 120) continue;
        const newItemMatch = text.match(/^New Item:\s*(.+)$/i);
        if (newItemMatch) {
          const itemName = newItemMatch[1].trim();
          currentKey = normalizeLookupKey(itemName);
          if (!items.has(currentKey)) {
            items.set(currentKey, { name: itemName, listBlocks: [] });
          }
          continue;
        }
        if (text.startsWith('Old') || /^New$/i.test(text)) continue;
        currentKey = normalizeLookupKey(text);
        if (!items.has(currentKey)) {
          items.set(currentKey, { name: text, listBlocks: [] });
        }
      } else if (block.type === 'list' && currentKey) {
        items.get(currentKey).listBlocks.push(block.items || []);
      }
    }
  };

  ingestBlocks(section?.content);
  for (const sub of section?.subsections || []) {
    ingestBlocks(sub.content);
  }

  const result = [];
  for (const entry of items.values()) {
    const mergedListItems = entry.listBlocks.flat();
    const detail = parseItemChangeList(mergedListItems);
    const lines = detail.flatLines.length ? detail.flatLines : collectLines(mergedListItems, []);
    result.push({
      name: entry.name,
      bucket: inferBucketFromLines(lines),
      lines,
      detail,
    });
  }
  return result;
}

const ITEM_STAT_WORDS =
  /\b(protection|health|mana|power|strength|intelligence|attack speed|cooldown rate|tenacity|dampening|plating|lifesteal|penetration|movement speed|hp5|mp5)\b/i;

function isItemStatLine(text) {
  const t = String(text || '').trim();
  if (!t || /:$/.test(t)) return false;
  if (/\bfor \d+(?:\.\d+)?\s*(?:s|sec|seconds|min)\b/i.test(t)) return false;
  if (/^cooldown\b/i.test(t)) return false;
  if (/^on use:/i.test(t)) return false;
  if (/\b(heal|restore|on hit|on use|per second|when|while)\b/i.test(t)) return false;
  if (
    /^(damaged|stuns|crowd\s*control|enemies within|this damage|protective link|-\d+%)/i.test(t)
  ) {
    return false;
  }
  return /^\d+(?:\.\d+)?\s*%?\s+\S+/i.test(t) && ITEM_STAT_WORDS.test(t);
}

function isBalanceChangelogLine(text) {
  return /\b(reduced|increased|decreased|changed|no longer|now builds|now )\b/i.test(
    String(text || '')
  );
}

function walkItemEntry(item, stats, passive, depth = 0) {
  const text = (item.text || '').trim();
  if (!text) return;

  if (isItemStatLine(text)) {
    stats.push(text);
    return;
  }

  passive.push({ text, depth });
  for (const child of item.items || []) {
    walkItemEntry(child, stats, passive, depth + 1);
  }
}

function normalizePassiveDepth(passive) {
  const out = [];
  let afterTrigger = false;
  for (const entry of passive) {
    const text = entry.text || '';
    if (text.trim().endsWith(':')) {
      afterTrigger = true;
      out.push(entry);
    } else if (afterTrigger && entry.depth === 0) {
      out.push({ ...entry, depth: 1 });
    } else {
      afterTrigger = false;
      out.push(entry);
    }
  }
  return out;
}

function splitItemVersion(items) {
  const stats = [];
  const passive = [];
  for (const item of items || []) {
    walkItemEntry(item, stats, passive);
  }
  return { stats, passive: normalizePassiveDepth(passive) };
}

function parseItemChangeList(listItems) {
  const result = {
    hasVersions: false,
    old: null,
    new: null,
    meta: [],
    flatLines: [],
  };

  const metaFromItem = (item) => {
    const lines = collectLines([item], []);
    result.meta.push(...lines);
    result.flatLines.push(...lines);
  };

  for (const item of listItems || []) {
    const text = (item.text || '').trim();
    if (/^old$/i.test(text)) {
      result.hasVersions = true;
      result.old = splitItemVersion(item.items || []);
    } else if (/^new$/i.test(text)) {
      result.hasVersions = true;
      result.new = splitItemVersion(item.items || []);
    } else {
      metaFromItem(item);
    }
  }

  if (!result.hasVersions && listItems?.length) {
    const hasChangelogLine = listItems.some((item) => isBalanceChangelogLine(item.text));
    if (!hasChangelogLine) {
      const version = splitItemVersion(listItems);
      if (version.stats.length > 0 || version.passive.length > 0) {
        result.new = version;
        result.flatLines = [
          ...version.stats,
          ...version.passive.map((p) => (typeof p === 'string' ? p : p.text)),
        ];
      }
    }
  }

  return result;
}

function isAspectLabelLine(line) {
  const t = String(line || '').trim();
  if (!/^Aspect of /i.test(t)) return false;
  if (/\s(?:reenabled|buffed|nerfed|adjusted|disabled|restored)\b/i.test(t)) return false;
  return /^Aspect of (?:the )?[A-Za-z]+(?:\s+[A-Za-z]+)*$/i.test(t);
}

function partitionChangeLines(lines) {
  const aspectLines = [];
  const baseLines = [];
  if (!lines?.length) return { aspectLines, baseLines };

  let i = 0;
  while (i < lines.length) {
    if (isAspectLabelLine(lines[i])) {
      aspectLines.push(lines[i]);
      i += 1;
      while (i < lines.length && !isAspectLabelLine(lines[i])) {
        aspectLines.push(lines[i]);
        i += 1;
      }
    } else {
      baseLines.push(lines[i]);
      i += 1;
    }
  }
  return { aspectLines, baseLines };
}

function isAspectChange(change) {
  if (change?.scope === 'aspect') return true;
  if (isAspectLabelLine(change?.ability)) return true;
  return /^aspect of /i.test(String(change?.ability || '').trim());
}

function splitChangesByScope(changes) {
  const aspectChanges = [];
  const baseChanges = [];

  for (const change of changes || []) {
    if (isAspectChange(change)) {
      if (isAspectLabelLine(change.ability) && change.scope !== 'aspect') {
        aspectChanges.push({
          ability: 'General',
          lines: [change.ability, ...(change.lines || [])],
          subAbilities: change.subAbilities,
          scope: 'aspect',
        });
      } else {
        aspectChanges.push(change);
      }
      continue;
    }

    const { aspectLines, baseLines } = partitionChangeLines(change.lines || []);
    if (baseLines.length) {
      baseChanges.push({ ability: change.ability, lines: baseLines });
    }
    if (aspectLines.length) {
      aspectChanges.push({ ability: change.ability, lines: aspectLines });
    }
  }
  return { aspectChanges, baseChanges };
}

function inferAspectLabelFromNote(note) {
  if (!note) return null;
  const trimmed = String(note).trim();
  if (isAspectLabelLine(trimmed)) return trimmed;
  if (!/aspect of/i.test(trimmed)) return null;
  const withoutSuffix = trimmed.replace(
    /\s+(?:reenabled|buffed|nerfed|adjusted|disabled|restored)\b.*$/i,
    ''
  );
  const m = withoutSuffix.match(/^(Aspect of (?:the )?[A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
  return m ? m[1].trim() : withoutSuffix;
}

function entryName(entry) {
  return typeof entry === 'string' ? entry : entry.name;
}

function isAspectHighlightEntry(entry) {
  const note = typeof entry === 'string' ? '' : entry.note || '';
  return Boolean(inferAspectLabelFromNote(note)) || /aspect of/i.test(note);
}

function isBaseHighlightEntry(entry) {
  const note = typeof entry === 'string' ? '' : entry.note || '';
  return /base kit/i.test(note);
}

function findParsedItem(parsedItems, itemName) {
  const key = normalizeLookupKey(itemName);
  const slug = (s) => normalizeLookupKey(s).replace(/[^a-z0-9]/g, '');
  const keySlug = slug(itemName);
  const byName = new Map(parsedItems.map((i) => [normalizeLookupKey(i.name), i]));
  if (byName.has(key)) return byName.get(key);
  const theKey = normalizeLookupKey(`The ${itemName}`);
  if (byName.has(theKey)) return byName.get(theKey);
  for (const [k, item] of byName.entries()) {
    const kSlug = slug(k);
    if (k === key || k.includes(key) || key.includes(k)) return item;
    if (kSlug === keySlug || kSlug.includes(keySlug) || keySlug.includes(kSlug)) return item;
    if (kSlug === slug(`the${itemName}`) || kSlug === slug(`the ${itemName}`)) return item;
  }
  return null;
}

function mergeGodBuckets(highlights, parsedGods) {
  const buckets = {
    buffed: [],
    nerfed: [],
    adjusted: [],
    shifted: [],
  };

  const nerfedList = highlights?.gods?.nerfed || [];
  const buffedList = highlights?.gods?.buffed || [];
  const adjustedList = highlights?.gods?.adjusted || [];

  const makeEntry = (entry, bucket, scope, changes, aspectLabel) => {
    const name = entryName(entry);
    const note = typeof entry === 'string' ? undefined : entry.note;
    return {
      name,
      note,
      scope,
      bucket,
      aspectLabel: aspectLabel || null,
      changes,
      gridKey: `${bucket}-${name}-${scope}-${aspectLabel || note || 'default'}`,
    };
  };

  const pickChanges = (name, entry, allChanges) => {
    const { aspectChanges, baseChanges } = splitChangesByScope(allChanges);
    if (isAspectHighlightEntry(entry)) {
      const label = inferAspectLabelFromNote(entry.note);
      return {
        scope: 'aspect',
        changes: aspectChanges.length
          ? aspectChanges
          : allChanges.filter((c) => (c.lines || []).some(isAspectLabelLine)),
        aspectLabel: label,
      };
    }
    if (isBaseHighlightEntry(entry)) {
      return {
        scope: 'base',
        changes: baseChanges.length
          ? baseChanges
          : allChanges.filter((c) => !(c.lines || []).some(isAspectLabelLine)),
        aspectLabel: null,
      };
    }
    return { scope: 'full', changes: allChanges, aspectLabel: null };
  };

  const resolveDisplayBucket = (name, scope, changes) => {
    let displayBucket = inferBucketFromChanges(changes);

    // Aspect rows: never inherit a false "shifted" from unrelated base/aspect lines in the patch blob.
    if (scope === 'aspect' && displayBucket === 'shifted' && !inferBucketHasBoth(changes)) {
      const lines = (changes || []).flatMap((c) => c.lines || []);
      displayBucket = inferBucketFromLines(lines);
    }

    return displayBucket;
  };

  const processHighlightList = (list, sourceBucket) => {
    for (const entry of list || []) {
      const name = entryName(entry);
      const parsed = parsedGods.gods?.[name];
      const allChanges = parsed?.changes || [];
      const picked = pickChanges(name, entry, allChanges);
      let displayBucket = resolveDisplayBucket(name, picked.scope, picked.changes);

      // Curated adjusted row + reenabled/readjust note → stay ADJUSTED when lines are mixed tuning.
      if (sourceBucket === 'adjusted' && displayBucket === 'nerfed') {
        const note = typeof entry === 'string' ? '' : entry.note || '';
        const lines = (picked.changes || []).flatMap((c) => c.lines || []);
        const readjust =
          /\b(reenabled|readjusted|adjusted)\b/i.test(note) ||
          lines.some((l) => /\b(reenabled|readjusted|adjusted and reenabled|has been adjusted)\b/i.test(l));
        if (readjust) displayBucket = 'adjusted';
      }

      if (sourceBucket === 'nerfed' && displayBucket !== 'nerfed') {
        displayBucket = 'nerfed';
      }

      buckets[displayBucket].push(
        makeEntry(entry, displayBucket, picked.scope, picked.changes, picked.aspectLabel)
      );
    }
  };

  processHighlightList(nerfedList, 'nerfed');
  processHighlightList(buffedList, 'buffed');
  processHighlightList(adjustedList, 'adjusted');

  const listed = new Set(
    [...buckets.buffed, ...buckets.nerfed, ...buckets.adjusted, ...buckets.shifted].map((e) =>
      e.name.toLowerCase()
    )
  );

  for (const [name, data] of Object.entries(parsedGods.gods || {})) {
    if (name === 'Base Stat Changes' || listed.has(name.toLowerCase())) continue;
    const bucket = data.bucket || 'adjusted';
    buckets[bucket].push(
      makeEntry({ name }, bucket, 'full', data.changes || [], null)
    );
    listed.add(name.toLowerCase());
  }

  return buckets;
}

function inferBucketHasBoth(changes) {
  let hasBuff = false;
  let hasNerf = false;
  for (const line of (changes || []).flatMap((c) => c.lines || [])) {
    const kind = classifyChangeLine(line);
    if (kind === 'buff') hasBuff = true;
    if (kind === 'nerf') hasNerf = true;
  }
  return hasBuff && hasNerf;
}

function mergeItemBuckets(highlights, parsedItems) {
  const buckets = {
    buffed: [],
    nerfed: [],
    adjusted: [],
    shifted: [],
    new: [],
  };

  const processList = (list, sourceBucket) => {
    for (const entry of list || []) {
      const name = entryName(entry);
      const nameKey = normalizeLookupKey(name).toLowerCase();
      const parsed = findParsedItem(parsedItems, name);
      const lines = parsed?.lines || [];
      let displayBucket = inferBucketFromLines(lines);

      if (!lines.length && sourceBucket) {
        displayBucket = sourceBucket;
      } else if (sourceBucket === 'adjusted') {
        displayBucket = 'adjusted';
      } else if (sourceBucket === 'new') {
        displayBucket = 'new';
      } else if (sourceBucket === 'buffed' && displayBucket !== 'nerfed') {
        displayBucket = displayBucket === 'shifted' ? 'adjusted' : 'buffed';
      } else if (sourceBucket === 'nerfed' && displayBucket === 'shifted') {
        displayBucket = 'adjusted';
      } else if (sourceBucket && !lines.length) {
        displayBucket = sourceBucket;
      }

      const itemEntry = {
        name: parsed?.name || name,
        note: typeof entry === 'string' ? undefined : entry.note,
        lines,
        detail: parsed?.detail || null,
        bucket: displayBucket,
        gridKey: `item-${displayBucket}-${nameKey}`,
      };

      if (!buckets[displayBucket].some((i) => i.gridKey === itemEntry.gridKey)) {
        buckets[displayBucket].push(itemEntry);
      }
    }
  };

  processList(highlights?.items?.new, 'new');
  processList(highlights?.items?.nerfed, 'nerfed');
  processList(highlights?.items?.buffed, 'buffed');
  processList(highlights?.items?.adjusted, 'adjusted');

  return buckets;
}

function deriveHighlightsFromPatch(patchJson) {
  if (!patchJson) return null;

  const sections = patchJson.sections || [];
  const num = patchJson.meta?.number;
  const newGodSection =
    findSection(sections, 'new classic god') || findSection(sections, 'new ported god');
  const wmSection = findSection(sections, 'wandering market');
  const balanceSection = findSection(sections, 'god balance');
  const itemSection = findSection(sections, 'item balance');

  const parsedBalance = parseGodBalanceSection(balanceSection);
  const parsedItems = parseItemBalanceSection(itemSection);
  const newGodsFromPatch = parseNewGodsSection(newGodSection);
  const wmFromPatch = parseWanderingMarketSection(wmSection);

  const godsByBucket = { buffed: [], nerfed: [], adjusted: [] };
  for (const data of Object.values(parsedBalance.gods || {})) {
    const name = data.name;
    if (!name || /^base stat changes$/i.test(name)) continue;
    const bucket = data.bucket === 'shifted' ? 'adjusted' : data.bucket || 'adjusted';
    if (!godsByBucket[bucket]) godsByBucket.adjusted.push({ name });
    else godsByBucket[bucket].push({ name });
  }

  const itemsByBucket = { buffed: [], nerfed: [], adjusted: [], new: [] };
  for (const item of parsedItems) {
    const bucket = item.bucket === 'shifted' ? 'adjusted' : item.bucket || 'adjusted';
    if (!itemsByBucket[bucket]) itemsByBucket.adjusted.push({ name: item.name });
    else itemsByBucket[bucket].push({ name: item.name });
  }

  return {
    patchNumber: num,
    patchLabel: `OB${num}`,
    summaryLine: patchJson.meta?.infoboxTitle || '',
    new: {
      gods: newGodsFromPatch.map((g) => ({ name: g.name, title: g.name })),
      aspects: [],
      skins: [],
      wanderingMarket: wmFromPatch.map((wm) => ({
        title: wm.title,
        god: wm.god,
        premiumUnlocks: wm.premiumUnlocks,
      })),
      events: [],
      items: itemsByBucket.new.map((i) => i.name),
    },
    gods: godsByBucket,
    items: itemsByBucket,
    systems: [],
  };
}

function buildSimpleSummary(patchJson, highlights) {
  if (!patchJson) return null;

  const resolvedHighlights = highlights || deriveHighlightsFromPatch(patchJson);
  if (!resolvedHighlights) return null;

  const sections = patchJson.sections || [];
  const newGodSection = findSection(sections, 'new classic god') || findSection(sections, 'new ported god');
  const wmSection = findSection(sections, 'wandering market');
  const balanceSection = findSection(sections, 'god balance');
  const itemSection = findSection(sections, 'item balance');
  const modesSection = findSection(sections, 'game modes');

  const parsedBalance = parseGodBalanceSection(balanceSection);
  const parsedItems = parseItemBalanceSection(itemSection);
  const newGodsFromPatch = parseNewGodsSection(newGodSection);
  const wmFromPatch = parseWanderingMarketSection(wmSection);
  const gameModes = parseGameModesSection(modesSection);

  const hlWm = resolvedHighlights.new?.wanderingMarket || [];
  const wanderingMarket = wmFromPatch.map((wm, idx) => ({
    ...wm,
    ...(hlWm[idx] || {}),
    title: hlWm[idx]?.title || wm.title,
    featuredImage: hlWm[idx]?.featuredImage || hlWm[idx]?.image || null,
  }));

  return {
    patchNumber: resolvedHighlights.patchNumber || patchJson.meta?.number,
    patchLabel: resolvedHighlights.patchLabel || `OB${patchJson.meta?.number}`,
    releaseDate: patchJson.meta?.releaseDate,
    infoboxTitle: patchJson.meta?.infoboxTitle,
    summaryLine: resolvedHighlights.summaryLine || '',
    newGods: (resolvedHighlights.new?.gods || []).map((g) => {
      const patchGod = newGodsFromPatch.find(
        (p) => p.name.toLowerCase() === g.name.toLowerCase()
      );
      return {
        ...g,
        changes: patchGod?.changes || [],
      };
    }),
    newAspects: resolvedHighlights.new?.aspects || [],
    wanderingMarket,
    gods: mergeGodBuckets(resolvedHighlights, parsedBalance),
    items: mergeItemBuckets(resolvedHighlights, parsedItems),
    systems: resolvedHighlights.systems || [],
    gameModes,
    balanceIntro: [parsedBalance.introNote, ...(parsedBalance.globalNotes || [])]
      .filter(Boolean)
      .join(' '),
  };
}

module.exports = {
  buildSimpleSummary,
  deriveHighlightsFromPatch,
  parseGodBalanceSection,
  parseContentBlocksToChanges,
  collectLines,
  normalizeAbilityLabel,
  splitChangesByScope,
  isAspectLabelLine,
  inferAspectLabelFromNote,
};
