#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Tales of Arabia.json only.
 *
 * Input: scripts/.vision-tag-tales-of-arabia-data.json
 * Log:   scripts/.vision-tag-tales-of-arabia.log
 *
 *   node scripts/apply-vision-tags-tales-of-arabia.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-tales-of-arabia-data.json');
process.argv.push('--log=scripts/.vision-tag-tales-of-arabia.log');

require('./apply-vision-tags-batch-b.js');
