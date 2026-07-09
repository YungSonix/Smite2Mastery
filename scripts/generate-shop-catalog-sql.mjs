/**
 * Generates supabase/shop_item_catalog_seed.sql from lib/shopData.js
 * Run: node scripts/generate-shop-catalog-sql.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const shopDataPath = path.join(root, 'lib', 'shopData.js');
const outPath = path.join(root, 'supabase', 'shop_item_catalog_seed.sql');

// Evaluate the real pool (handles spread/dynamically-generated items like titles)
const source = fs.readFileSync(shopDataPath, 'utf8');
const transformed = source
  .replace(/import\s+\{[^}]*\}\s+from\s+'[^']*';?/g, '') // drop themeColors import
  .replace(/export\s+const/g, 'const') // strip exports for Function scope
  .replace(/export\s+function/g, 'function');
// eslint-disable-next-line no-new-func
const getPool = new Function('COLORS', `${transformed}\nreturn SHOP_ITEM_POOL;`);
const pool = getPool(new Proxy({}, { get: () => '#000000' }));

const rows = [];
const seen = new Set();
for (const item of pool) {
  if (!item || !item.id || !Number.isFinite(Number(item.cost))) continue;
  if (seen.has(item.id)) continue;
  seen.add(item.id);
  rows.push({ id: String(item.id).replace(/'/g, "''"), cost: Number(item.cost) });
}

const lines = [
  '-- AUTO-GENERATED from lib/shopData.js — run: node scripts/generate-shop-catalog-sql.mjs',
  'insert into public.shop_item_catalog (item_id, gold_cost)',
  'values',
  ...rows.map((r, i) => `  ('${r.id}', ${r.cost})${i < rows.length - 1 ? ',' : ''}`),
  'on conflict (item_id) do update set gold_cost = excluded.gold_cost;',
  '',
];

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${rows.length} items to ${outPath}`);
