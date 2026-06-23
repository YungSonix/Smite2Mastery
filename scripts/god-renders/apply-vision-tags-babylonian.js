#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Babylonian.json only.
 *
 * Input: scripts/god-renders/.vision-tag-babylonian-data.json
 * Log:   scripts/god-renders/.vision-tag-babylonian.log
 *
 *   node scripts/god-renders/apply-vision-tags-babylonian.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-babylonian-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-babylonian.log');

require('./apply-vision-tags-batch-b.js');
