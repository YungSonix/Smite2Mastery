#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Celtic.json only.
 *
 * Input: scripts/god-renders/.vision-tag-celtic-data.json
 * Log:   scripts/god-renders/.vision-tag-celtic.log
 *
 *   node scripts/god-renders/apply-vision-tags-celtic.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-celtic-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-celtic.log');

require('./apply-vision-tags-batch-b.js');
