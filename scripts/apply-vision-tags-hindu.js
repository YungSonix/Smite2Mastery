#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Hindu.json only.
 *
 * Input: scripts/.vision-tag-hindu-data.json
 * Log:   scripts/.vision-tag-hindu.log
 *
 *   node scripts/apply-vision-tags-hindu.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-hindu-data.json');
process.argv.push('--log=scripts/.vision-tag-hindu.log');

require('./apply-vision-tags-batch-b.js');
