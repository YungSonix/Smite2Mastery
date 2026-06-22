#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Chinese.json only.
 *
 * Input: scripts/.vision-tag-chinese-data.json
 * Log:   scripts/.vision-tag-chinese.log
 *
 *   node scripts/apply-vision-tags-chinese.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/.vision-tag-chinese-data.json');
process.argv.push('--log=scripts/.vision-tag-chinese.log');

require('./apply-vision-tags-batch-b.js');
