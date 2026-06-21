/**
 * GitHub Item Icons use mixed naming (PascalCase, lowerCamelCase, all-lowercase,
 * spaced/hyphenated PNG uploads). Map normalized keys → canonical filename on master.
 */
export function normalizeItemIconKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** @type {Record<string, string>} */
export const ITEM_ICON_FILE_ALIASES = {
  axe: 'axe.webp',
  sunderingaxe: 'sunderingaxe.webp',
  warriorsaxe: 'sunderingaxe.webp',
  moteofchaos: 'moteOfChaos.webp',
  agilitygreaves: 'agilityGreaves.webp',
  blinkingabyss: 'blinkingAbyss.webp',
  shellofrebuke: 'shellOfRebuke.webp',
  timelockaegis: 'timeLockAegis.webp',
  glutgrimoire: 'glutGrimoire.webp',
  gluttonousgrimoire: 'glutGrimoire.webp',
  silkenmailcoat: 'silkenmailcoat.webp',
  spectralarmor: 'silkenmailcoat.webp',
  purificationbeads: 'PurificationBeads.webp',
  aladdinslamp: 'aladdinsLamp.webp',
  bloodboundbook: 'Blood-BoundBook.webp',
  wishgrantingpearl: 'Wish-GrantingPearl.webp',
  ragnarokswake: 'RagnaroksWake.webp',
  staffofmyrddin: 'staffofmyrddin.webp',
  shogunsofuda: 'shogunsofuda.webp',
  sunderingarc: 'sunderingArc.webp',
  sunderingecho: 'sunderingEcho.webp',
};

/** Spaced / hyphenated PNG filenames on GitHub (exact basename). */
export const ITEM_ICON_SPACED_FILES = {
  agilitygreaves: 'Agility Greaves.png',
  blinkingabyss: 'Blinking Abyss.png',
  moteofchaos: 'Mote Of Chaos.png',
  shellofrebuke: 'Shell Of Rebuke.png',
  timelockaegis: 'Time-lock Aegis.png',
  talismanofpurification: 'Talisman of Purification.png',
  sunder: 'Sunder.PNG',
  sunderingecho: 'Sundering Echo.png',
};

export function camelCaseToSpacedLabel(stem) {
  return stem
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}
