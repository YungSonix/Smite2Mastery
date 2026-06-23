#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Arthurian.json only.
 *
 * Input: scripts/god-renders/.vision-tag-arthurian-data.json
 * Log:   scripts/god-renders/.vision-tag-arthurian.log
 *
 *   node scripts/god-renders/apply-vision-tags-arthurian.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-arthurian-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-arthurian.log');

require('./apply-vision-tags-batch-b.js');
