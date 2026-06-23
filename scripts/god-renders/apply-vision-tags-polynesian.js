#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Polynesian.json only.
 *
 * Input: scripts/god-renders/.vision-tag-polynesian-data.json
 * Log:   scripts/god-renders/.vision-tag-polynesian.log
 *
 *   node scripts/god-renders/apply-vision-tags-polynesian.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-polynesian-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-polynesian.log');

require('./apply-vision-tags-batch-b.js');
