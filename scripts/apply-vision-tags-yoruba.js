#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Yoruba.json only.
 *
 * Input: scripts/.vision-tag-yoruba-data.json
 * Log:   scripts/.vision-tag-yoruba.log
 *
 *   node scripts/apply-vision-tags-yoruba.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-yoruba-data.json');
process.argv.push('--log=scripts/.vision-tag-yoruba.log');

require('./apply-vision-tags-batch-b.js');
