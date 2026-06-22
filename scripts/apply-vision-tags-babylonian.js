#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Babylonian.json only.
 *
 * Input: scripts/.vision-tag-babylonian-data.json
 * Log:   scripts/.vision-tag-babylonian.log
 *
 *   node scripts/apply-vision-tags-babylonian.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-babylonian-data.json');
process.argv.push('--log=scripts/.vision-tag-babylonian.log');

require('./apply-vision-tags-batch-b.js');
