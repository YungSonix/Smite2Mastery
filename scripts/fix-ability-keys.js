/**
 * Repair wrong-god ability/passive `key` fields on main god kits in builds.json
 * (e.g. Agni A01 keyed as Anubis.A01.InGame.Short). Skips aspect sub-kits.
 *
 * Run: node scripts/fix-ability-keys.js          (dry-run)
 *      node scripts/fix-ability-keys.js --write
 */
const fs = require('fs');
const path = require('path');

const BUILDS_PATH = path.join(__dirname, '../app/data/God Information/Builds/builds.json');

function normGod(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function resolveGodKey(god) {
  let key = god.key || god.internalName || '';
  if (/^god\./i.test(key)) key = key.slice(key.indexOf('.') + 1);
  key = String(key).replace(/_Item$/i, '').trim();
  if (key) return key;
  if (god.name) return String(god.name).replace(/[^a-zA-Z0-9]/g, '');
  return null;
}

function slotFromAbilityKey(key) {
  const text = String(key || '').trim();
  if (!text) return null;
  const dotted = text.match(/^[^.]+\.(.+?)\.(?:InGame|OutOfGame)(?:\.|$)/i);
  if (dotted) return dotted[1];
  if (/^(A0[1-4]|PSV)$/i.test(text)) return text.toUpperCase();
  return null;
}

function expectedKey(godKey, slot) {
  return `${godKey}.${slot}.InGame.Short`;
}

function shouldFixKey(godKey, slot, current) {
  const want = expectedKey(godKey, slot);
  if (!current) return want;
  const keyGodNorm = normGod(String(current).split('.')[0]);
  const godNorm = normGod(godKey);
  const slotFromKey = slotFromAbilityKey(current);
  const slotMismatch =
    slotFromKey && normGod(slotFromKey) !== normGod(slot);
  if (keyGodNorm !== godNorm || slotMismatch) return want;
  if (/^(A0[1-4]|PSV)$/i.test(String(current).trim())) return want;
  return null;
}

function fixKit(godLabel, godKey, kit, changes, write) {
  if (!kit || typeof kit !== 'object' || !godKey) return;

  if (kit.passive && typeof kit.passive === 'object') {
    const want = shouldFixKey(godKey, 'PSV', kit.passive.key);
    if (want) {
      changes.push({ god: godLabel, slot: 'PSV', from: kit.passive.key || '(missing)', to: want });
      if (write) kit.passive.key = want;
    }
  }

  Object.entries(kit.abilities || {}).forEach(([slot, ability]) => {
    if (!ability || typeof ability !== 'object') return;
    if (!/^A0[1-4]$/i.test(slot)) return;
    const want = shouldFixKey(godKey, slot, ability.key);
    if (want) {
      changes.push({ god: godLabel, slot, from: ability.key || '(missing)', to: want });
      if (write) ability.key = want;
    }
  });
}

function walkGodRows(node, visit) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((item) => walkGodRows(item, visit));
    return;
  }
  if (typeof node === 'object' && (node.baseKit || node.abilities || node.key || node.name)) {
    visit(node);
  }
}

function main() {
  const write = process.argv.includes('--write');
  const raw = JSON.parse(fs.readFileSync(BUILDS_PATH, 'utf8'));
  const changes = [];

  walkGodRows(raw.gods, (god) => {
    const godKey = resolveGodKey(god);
    const godLabel = god.name || godKey || god.internalName || '(unknown)';
    if (!godKey) return;

    if (god.baseKit && typeof god.baseKit === 'object') {
      fixKit(godLabel, godKey, god.baseKit, changes, write);
    } else if (god.abilities && typeof god.abilities === 'object') {
      fixKit(godLabel, godKey, god, changes, write);
    }
  });

  console.log(`${changes.length} ability key(s) to fix${write ? ' (written)' : ' (dry-run)'}`);
  changes.slice(0, 30).forEach((c) => {
    console.log(`  ${c.god} ${c.slot}: ${c.from} → ${c.to}`);
  });
  if (changes.length > 30) console.log(`  … and ${changes.length - 30} more`);

  if (write && changes.length > 0) {
    fs.writeFileSync(BUILDS_PATH, `${JSON.stringify(raw, null, 4)}\n`, 'utf8');
  }
}

main();
