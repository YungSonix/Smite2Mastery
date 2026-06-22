#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Korean.json only.
 *
 * Input: scripts/.vision-tag-korean-data.json
 * Log:   scripts/.vision-tag-korean.log
 *
 *   node scripts/apply-vision-tags-korean.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-korean-data.json');
process.argv.push('--log=scripts/.vision-tag-korean.log');

require('./apply-vision-tags-batch-b.js');
