/**
 * Build a Prophecy-facing god ability reference from app/data/builds.json.
 *
 * Run:
 *   node scripts/generate-god-abilities-reference.js
 */

const fs = require('fs');
const path = require('path');

const buildsPath = path.join(__dirname, '../app/data/builds.json');
const outputPath = path.join(__dirname, '../lib/godAbilities.ts');

function flattenAny(input) {
  if (!input) return [];
  if (!Array.isArray(input)) return [input];
  return input.flat(Infinity).filter(Boolean);
}

function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateSentence(text, max = 120) {
  const cleaned = cleanText(text);
  if (!cleaned) return 'No description available.';
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3).trim()}...`;
}

function classifyAbility(name, description, isUltimate = false) {
  if (isUltimate) return 'ULTIMATE';

  const haystack = `${name || ''} ${description || ''}`.toLowerCase();

  // Decision rule for trap conversion:
  // - placed and waits for enemy trigger
  // - reactive counters
  // - blocks/prevents enemy actions
  const hasTrapObject = /\btrap\b|\bmine\b|\bglyph\b|\bsigil\b|\bward\b/.test(haystack);
  const hasPlacementLanguage = /\bplace\b|\bdeploy\b|\bset\b|\blay\b|\bcreate\b/.test(haystack);
  const hasTriggerLanguage =
    /\btrigger\b|\bwhen an enemy\b|\bif an enemy\b|\bon enemy (attack|cast|move|deploy)\b/.test(haystack);
  const hasReactiveLanguage = /\bcounter\b|\bparry\b|\breflect\b|\bintercept\b/.test(haystack);
  const hasBlockingLanguage =
    /\bblock\b|\bblocking\b|\bprevent\b|\bprevents\b|\bstop\b/.test(haystack) &&
    /\battack\b|\bmovement\b|\bability\b|\baction\b/.test(haystack);
  const isWallThatBlocks = /\bwall\b/.test(haystack);

  const trapSignal =
    (hasTrapObject && (hasPlacementLanguage || hasTriggerLanguage)) ||
    hasReactiveLanguage ||
    hasBlockingLanguage ||
    isWallThatBlocks;

  if (trapSignal) return 'TRAP';

  // One-time, direct cast payloads can be represented as spell cards.
  const spellSignal = /\blaunch\b|\bfire\b.*\bprojectile\b|\bthrow\b|\bdetonate\b/.test(haystack);
  if (spellSignal) return 'SPELL';

  return 'ABILITY';
}

function passiveCardUse(passiveDesc) {
  return `PASSIVE — ${truncateSentence(passiveDesc, 110)}`;
}

function abilityCardUse(abilityName, abilityDesc, classification) {
  if (classification === 'TRAP') {
    return `TRAP CARD — becomes ${abilityName} trap card, NOT on god card`;
  }
  if (classification === 'SPELL') {
    return `SPELL CARD — one-time cast based on ${abilityName}`;
  }
  return `ABILITY — ${truncateSentence(abilityDesc, 105)}`;
}

function ultimateCardUse(ultimateDesc) {
  return `ULTIMATE — ${truncateSentence(ultimateDesc, 110)}`;
}

function pickKeyword(god) {
  const roles = Array.isArray(god.roles) ? god.roles.map((r) => String(r).toLowerCase()) : [];
  const range = String(god.range || '').toLowerCase();
  const type = String(god.Type || '').toLowerCase();

  if (range.includes('ranged')) return 'Ranged';
  if (roles.some((r) => r.includes('support') || r.includes('guardian'))) return 'Taunt';
  if (roles.some((r) => r.includes('jungle') || r.includes('assassin'))) return 'Backstab';
  if (type.includes('physical')) return 'Brawler';
  return 'Ranged';
}

function orderedAbilityEntries(abilitiesObj) {
  const entries = Object.entries(abilitiesObj || {});
  entries.sort(([a], [b]) => {
    const ai = Number(String(a).replace(/\D/g, '')) || 0;
    const bi = Number(String(b).replace(/\D/g, '')) || 0;
    return ai - bi;
  });
  return entries.map(([, ability]) => ability).filter(Boolean);
}

function toReferenceRow(god) {
  const passive = god.passive || {};
  const abilities = orderedAbilityEntries(god.abilities);

  const ability1Raw = abilities[0] || {};
  const ability2Raw = abilities[1] || {};
  const ability3Raw = abilities[2] || {};
  const ultimateRaw = abilities[3] || {};

  const ability1Class = classifyAbility(ability1Raw.name, ability1Raw.shortDesc, false);
  const ability2Class = classifyAbility(ability2Raw.name, ability2Raw.shortDesc, false);
  const ability3Class = classifyAbility(ability3Raw.name, ability3Raw.shortDesc, false);

  const ability1 = {
    name: ability1Raw.name || 'Ability 1',
    smiteDescription: cleanText(ability1Raw.shortDesc),
    cardUse: abilityCardUse(ability1Raw.name || 'Ability 1', ability1Raw.shortDesc, ability1Class),
    ...(ability1Class === 'TRAP' ? { spinsOffAs: 'TRAP' } : {}),
  };

  const ability2 = {
    name: ability2Raw.name || 'Ability 2',
    smiteDescription: cleanText(ability2Raw.shortDesc),
    cardUse: abilityCardUse(ability2Raw.name || 'Ability 2', ability2Raw.shortDesc, ability2Class),
    ...(ability2Class === 'TRAP' ? { spinsOffAs: 'TRAP' } : {}),
  };

  const ability3 = {
    name: ability3Raw.name || 'Ability 3',
    smiteDescription: cleanText(ability3Raw.shortDesc),
    cardUse: abilityCardUse(ability3Raw.name || 'Ability 3', ability3Raw.shortDesc, ability3Class),
    ...(ability3Class === 'TRAP' ? { spinsOffAs: 'TRAP' } : {}),
  };

  const ultimate = {
    name: ultimateRaw.name || 'Ultimate',
    smiteDescription: cleanText(ultimateRaw.shortDesc),
    cardUse: ultimateCardUse(ultimateRaw.shortDesc),
  };

  const spinsOffCards = [ability1, ability2, ability3]
    .filter((ability) => ability.spinsOffAs === 'TRAP')
    .map((ability) => ({
      type: 'TRAP',
      name: ability.name,
      effect: `Trigger: when an enemy acts — ${truncateSentence(ability.smiteDescription, 95)}`,
    }));

  const preferredAbility = [ability1, ability2, ability3].find((ability) => !ability.spinsOffAs) || ability1;

  return {
    id: god.name || god.internalName || 'Unknown',
    passive: {
      name: passive.name || 'Passive',
      smiteDescription: cleanText(passive.shortDesc),
      cardUse: passiveCardUse(passive.shortDesc),
    },
    ability1,
    ability2,
    ability3,
    ultimate,
    suggestedKeyword: pickKeyword(god),
    suggestedCardAbility: `${preferredAbility.name} — ${truncateSentence(preferredAbility.smiteDescription, 100)}`,
    suggestedUltimate: `${ultimate.name} — ${truncateSentence(ultimate.smiteDescription, 100)}`,
    spinsOffCards,
  };
}

function main() {
  const raw = fs.readFileSync(buildsPath, 'utf8');
  const data = JSON.parse(raw);
  const gods = flattenAny(data.gods || []);

  const reference = gods.map(toReferenceRow);
  const ts = `/* eslint-disable */
// Auto-generated by scripts/generate-god-abilities-reference.js
// Source: app/data/builds.json
// Do not edit this file manually; regenerate via:
//   node scripts/generate-god-abilities-reference.js

export const GOD_ABILITY_REFERENCE = ${JSON.stringify(reference, null, 2)} as const;

export type GodAbilityReferenceEntry = (typeof GOD_ABILITY_REFERENCE)[number];
`;

  fs.writeFileSync(outputPath, ts, 'utf8');
  console.log(`Generated ${outputPath} with ${reference.length} gods.`);
}

main();
