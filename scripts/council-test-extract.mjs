#!/usr/bin/env node
/**
 * Dry-run tests for council Final Verdict → TASKS.md extraction (no LLM).
 * Default: parse only. Pass --apply to write to TASKS.md (same as council:extract-verdict).
 */
import { extractTasksFromVerdict, applyVerdictTaskExtraction } from './council-repo-writes.mjs';

const FIXTURES = [
  {
    name: 'explicit TASK lines',
    decision: 'TASK: Fix Conquest Map zoom on web.\nTASK: Add skeleton loading to preview builds.',
    context: { topic: 'QoL sprint' },
    expectMin: 2,
  },
  {
    name: 'GOALS items list',
    decision: 'GOALS items — currency system, builds cleanup, and patch notes normalization.',
    context: {},
    expectMin: 2,
  },
  {
    name: 'Next convene imperatives',
    decision:
      'Next convene: rank three GOALS priorities and ship one player-visible win this week.',
    context: {},
    expectMin: 1,
  },
  {
    name: 'surface names from transcript',
    decision: 'We align on Prophecy deck builder polish.',
    context: {
      topic: 'Prophecy',
      messages: [{ text: 'Custom builder needs better item passives display.' }],
    },
    expectMin: 1,
  },
];

const apply = process.argv.includes('--apply');
let failed = 0;

console.log(`Council verdict extract test (${apply ? 'APPLY — writes TASKS.md' : 'dry-run only'})\n`);

for (const fx of FIXTURES) {
  const tasks = extractTasksFromVerdict(fx.decision, fx.context);
  const ok = tasks.length >= fx.expectMin;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${fx.name}`);
  console.log(`  extracted (${tasks.length}):`, tasks.length ? tasks.map((t) => `"${t}"`).join(', ') : '(none)');
  if (apply && tasks.length) {
    const r = applyVerdictTaskExtraction(fx.decision, fx.context);
    console.log(`  apply: wrote=${r.wrote} skipped=${r.skipped}`);
  }
  console.log('');
}

if (failed) {
  console.error(`${failed} fixture(s) failed.`);
  process.exit(1);
}

console.log('All extract fixtures passed.');
if (!apply) {
  console.log('\nTo write extracted tasks to TASKS.md (skips duplicates):');
  console.log('  npm run council:test-extract -- --apply');
  console.log('\nSingle verdict (writes immediately):');
  console.log('  npm run council:extract-verdict -- "Next convene: ship one Patch Hub fix."');
}
