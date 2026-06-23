#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Hindu.json only.
 *
 * Input: scripts/god-renders/.vision-tag-hindu-data.json
 * Log:   scripts/god-renders/.vision-tag-hindu.log
 *
 *   node scripts/god-renders/apply-vision-tags-hindu.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-hindu-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-hindu.log');

require('./apply-vision-tags-batch-b.js');
