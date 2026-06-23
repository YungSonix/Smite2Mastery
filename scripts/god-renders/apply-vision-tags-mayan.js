#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Mayan.json only.
 *
 * Input: scripts/god-renders/.vision-tag-mayan-data.json
 * Log:   scripts/god-renders/.vision-tag-mayan.log
 *
 *   node scripts/god-renders/apply-vision-tags-mayan.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-mayan-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-mayan.log');

require('./apply-vision-tags-batch-b.js');
