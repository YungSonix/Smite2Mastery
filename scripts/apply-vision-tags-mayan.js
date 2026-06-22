#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Mayan.json only.
 *
 * Input: scripts/.vision-tag-mayan-data.json
 * Log:   scripts/.vision-tag-mayan.log
 *
 *   node scripts/apply-vision-tags-mayan.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-mayan-data.json');
process.argv.push('--log=scripts/.vision-tag-mayan.log');

require('./apply-vision-tags-batch-b.js');
