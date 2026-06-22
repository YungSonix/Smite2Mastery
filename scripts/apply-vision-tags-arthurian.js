#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Arthurian.json only.
 *
 * Input: scripts/.vision-tag-arthurian-data.json
 * Log:   scripts/.vision-tag-arthurian.log
 *
 *   node scripts/apply-vision-tags-arthurian.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-arthurian-data.json');
process.argv.push('--log=scripts/.vision-tag-arthurian.log');

require('./apply-vision-tags-batch-b.js');
