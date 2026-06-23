/**
 * Wordle / Ability minigame god list (`app/data/Smite2Gods.json`).
 */
let cached = null;

export function getSmite2Gods() {
  if (!cached) {
    cached = require('../app/data/Smite2Gods.json');
  }
  return cached;
}
