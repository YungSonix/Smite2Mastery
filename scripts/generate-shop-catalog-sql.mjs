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

const source = fs.readFileSync(shopDataPath, 'utf8');
const re = /id:\s*'([^']+)'[^}]*?cost:\s*(\d+)/g;
const rows = [];
let match;
while ((match = re.exec(source)) !== null) {
  const id = match[1].replace(/'/g, "''");
  const cost = Number(match[2]);
  if (id && Number.isFinite(cost)) rows.push({ id, cost });
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
