#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Polynesian.json only.
 *
 * Input: scripts/.vision-tag-polynesian-data.json
 * Log:   scripts/.vision-tag-polynesian.log
 *
 *   node scripts/apply-vision-tags-polynesian.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-polynesian-data.json');
process.argv.push('--log=scripts/.vision-tag-polynesian.log');

require('./apply-vision-tags-batch-b.js');
