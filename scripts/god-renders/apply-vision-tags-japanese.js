#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Japanese.json only.
 *
 * Input: scripts/god-renders/.vision-tag-japanese-data.json
 * Log:   scripts/god-renders/.vision-tag-japanese.log
 *
 *   node scripts/god-renders/apply-vision-tags-japanese.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-japanese-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-japanese.log');

require('./apply-vision-tags-batch-b.js');
