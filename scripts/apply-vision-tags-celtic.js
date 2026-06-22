#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Celtic.json only.
 *
 * Input: scripts/.vision-tag-celtic-data.json
 * Log:   scripts/.vision-tag-celtic.log
 *
 *   node scripts/apply-vision-tags-celtic.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-celtic-data.json');
process.argv.push('--log=scripts/.vision-tag-celtic.log');

require('./apply-vision-tags-batch-b.js');
