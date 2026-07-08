#!/usr/bin/env node
/**
 * After capture: copy key shots for council, write agent brief + polish queue.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  COUNCIL_ATTACHMENT_LIMIT,
  LATEST_DIR,
  QUEUE_DIR,
  SCENARIOS,
} from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const COUNCIL_ATTACHMENTS = path.join(ROOT, 'docs', 'council', 'ui', 'attachments');
const PENDING_CONVENE = path.join(ROOT, 'docs', 'council', 'ui', 'pending-convene.json');

/** Priority order for council review (max 8). */
const PRIORITY_SHOT_IDS = [
  'desktop-builds-browse',
  'desktop-builds-tierlists',
  'desktop-custom-builder',
  'desktop-home',
  'mobile-builds-browse',
  'mobile-custom-builder',
  'mobile-builds-tierlists',
  'desktop-database-gods',
];

function pickCouncilShots(manifest) {
  const byId = new Map(manifest.shots.filter((s) => s.path).map((s) => [s.id, s]));
  const picked = [];
  for (const id of PRIORITY_SHOT_IDS) {
    if (byId.has(id)) picked.push(byId.get(id));
    if (picked.length >= COUNCIL_ATTACHMENT_LIMIT) break;
  }
  if (picked.length < COUNCIL_ATTACHMENT_LIMIT) {
    for (const s of manifest.shots) {
      if (!s.path || picked.some((p) => p.path === s.path)) continue;
      picked.push(s);
      if (picked.length >= COUNCIL_ATTACHMENT_LIMIT) break;
    }
  }
  return picked;
}

function copyToCouncilAttachments(shots) {
  const batchId = randomUUID();
  const batchDir = path.join(COUNCIL_ATTACHMENTS, batchId);
  fs.mkdirSync(batchDir, { recursive: true });

  const attachments = [];
  for (const shot of shots) {
    const src = path.join(ROOT, shot.path);
    if (!fs.existsSync(src)) continue;
    const filename = `${shot.id}.png`;
    const dest = path.join(batchDir, filename);
    fs.copyFileSync(src, dest);
    attachments.push({
      id: randomUUID(),
      name: `${shot.label} (${shot.viewport})`,
      mime: 'image/png',
      filename,
      url: `/attachments/${batchId}/${encodeURIComponent(filename)}`,
      path: path.relative(ROOT, dest).replace(/\\/g, '/'),
      batchId,
    });
  }
  return { batchId, attachments };
}

function writeAgentBrief({ manifest, councilAttachments, runDir }) {
  const latestDir = path.join(ROOT, LATEST_DIR);
  fs.mkdirSync(latestDir, { recursive: true });

  const brief = `# Autonomous polish brief

Generated: ${new Date().toISOString()}
Run: \`${manifest.runId}\`
Base URL: ${manifest.baseUrl}

## Mission
Review attached screenshots. Convene council (Nala, London, Fasa) on UX/layout issues.
Implement **preview fixes only** — do not commit. Match \`UI_THEME\` and existing patterns.

## Focus areas (in order)
1. **Tierlists** — Builds → Browse tierlists; layout, filters, loading
2. **Custom Builder** — mobile + desktop; god row, item grid, stats panel
3. **Nav** — main + sub row hierarchy; duplicate headers on desktop
4. **Builds browse** — filter chips, card layout on wide screens

## Screenshots (${manifest.shots.length} total)
${manifest.shots
  .map((s) => (s.path ? `- \`${s.path}\` — ${s.label} (${s.viewport})` : `- FAILED ${s.id}: ${s.error}`))
  .join('\n')}

## Council attachments (${councilAttachments.length})
${councilAttachments.map((a) => `- \`${a.path}\` — ${a.name}`).join('\n')}

## Agent loop
1. Read all shots under \`${runDir}\`
2. \`npm run council:go\` (pending convene queued) OR \`@council.mdc go\`
3. Implement top 3 verdict items
4. \`npm run polish:capture\` → re-read shots → one more pass if time
5. Log to \`Vault/3-Resources/Cursor agents/sessions/\` + \`scripts/visual-audit/latest/preview-summary.md\`

## Off limits unless verdict says so
Prophecy, shop economy, Supabase schema, git commit/push.
`;

  fs.writeFileSync(path.join(latestDir, 'agent-brief.md'), brief, 'utf8');
  fs.writeFileSync(path.join(latestDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.copyFileSync(path.join(ROOT, runDir, 'manifest.json'), path.join(latestDir, 'manifest.json'));

  return path.join(latestDir, 'agent-brief.md');
}

function writePendingConvene({ attachments, manifest }) {
  const topic = [
    'Visual audit — review attached screenshots of Smite Scroll web (mobile + desktop).',
    'Prioritize: tierlists, custom builder, nav chrome, builds browse layout.',
    'Stress-test each fix; Nala challenges scope creep. Final Verdict = top 3 preview changes only.',
    `Run ${manifest.runId} — ${manifest.shots.filter((s) => s.path).length} shots captured.`,
  ].join(' ');

  const pending = {
    status: 'new',
    topic,
    attachments,
    source: 'visual-audit',
    createdAt: new Date().toISOString(),
    manifestRunId: manifest.runId,
    scenarios: SCENARIOS.map((s) => s.id),
  };

  fs.mkdirSync(path.dirname(PENDING_CONVENE), { recursive: true });
  fs.writeFileSync(PENDING_CONVENE, JSON.stringify(pending, null, 2) + '\n', 'utf8');
  return pending;
}

function writePolishQueue({ manifest, briefPath, pending }) {
  const queueDir = path.join(ROOT, QUEUE_DIR);
  fs.mkdirSync(queueDir, { recursive: true });
  const queuePath = path.join(queueDir, 'pending-run.json');
  fs.writeFileSync(
    queuePath,
    JSON.stringify(
      {
        status: 'ready',
        createdAt: new Date().toISOString(),
        runId: manifest.runId,
        briefPath: path.relative(ROOT, briefPath).replace(/\\/g, '/'),
        pendingConvene: path.relative(ROOT, PENDING_CONVENE).replace(/\\/g, '/'),
        councilTopic: pending.topic,
        attachmentCount: pending.attachments.length,
        hint: 'In Cursor: @autonomous-polish.mdc go',
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
  return queuePath;
}

export function prepareBriefFromManifest(manifest, runDirRel) {
  const councilShots = pickCouncilShots(manifest);
  const { batchId, attachments } = copyToCouncilAttachments(councilShots);
  const briefPath = writeAgentBrief({ manifest, councilAttachments: attachments, runDir: runDirRel });
  const pending = writePendingConvene({ attachments, manifest });
  const queuePath = writePolishQueue({ manifest, briefPath, pending });

  return { batchId, briefPath, queuePath, pending, attachmentCount: attachments.length };
}

async function main() {
  const manifestArg = process.argv[2];
  let manifestPath;
  let runDirRel;

  if (manifestArg) {
    manifestPath = path.isAbsolute(manifestArg) ? manifestArg : path.join(ROOT, manifestArg);
    runDirRel = path.dirname(path.relative(ROOT, manifestPath)).replace(/\\/g, '/');
  } else {
    manifestPath = path.join(ROOT, LATEST_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      const shotsRoot = path.join(ROOT, 'scripts/visual-audit/shots');
      const runs = fs.readdirSync(shotsRoot).sort().reverse();
      if (!runs.length) {
        console.error('No capture runs found. Run: npm run polish:capture');
        process.exit(1);
      }
      manifestPath = path.join(shotsRoot, runs[0], 'manifest.json');
      runDirRel = path.relative(ROOT, path.dirname(manifestPath)).replace(/\\/g, '/');
    } else {
      runDirRel = LATEST_DIR;
    }
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const result = prepareBriefFromManifest(manifest, runDirRel);
  console.log(JSON.stringify({ ok: true, ...result, briefPath: path.relative(ROOT, result.briefPath) }, null, 2));
}

const isMain = process.argv[1]?.endsWith('prepare-brief.mjs');
if (isMain) main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
