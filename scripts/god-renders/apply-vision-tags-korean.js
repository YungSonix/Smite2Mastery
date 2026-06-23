#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Korean.json only.
 *
 * Input: scripts/god-renders/.vision-tag-korean-data.json
 * Log:   scripts/god-renders/.vision-tag-korean.log
 *
 *   node scripts/god-renders/apply-vision-tags-korean.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-korean-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-korean.log');

require('./apply-vision-tags-batch-b.js');
