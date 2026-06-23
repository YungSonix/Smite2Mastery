#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Chinese.json only.
 *
 * Input: scripts/god-renders/.vision-tag-chinese-data.json
 * Log:   scripts/god-renders/.vision-tag-chinese.log
 *
 *   node scripts/god-renders/apply-vision-tags-chinese.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-chinese-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-chinese.log');

require('./apply-vision-tags-batch-b.js');
