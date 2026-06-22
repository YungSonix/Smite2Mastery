#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Japanese.json only.
 *
 * Input: scripts/.vision-tag-japanese-data.json
 * Log:   scripts/.vision-tag-japanese.log
 *
 *   node scripts/apply-vision-tags-japanese.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-japanese-data.json');
process.argv.push('--log=scripts/.vision-tag-japanese.log');

require('./apply-vision-tags-batch-b.js');
