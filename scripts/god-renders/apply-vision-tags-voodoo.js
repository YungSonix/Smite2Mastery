#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Voodoo.json only.
 *
 * Input: scripts/god-renders/.vision-tag-voodoo-data.json
 * Log:   scripts/god-renders/.vision-tag-voodoo.log
 *
 *   node scripts/god-renders/apply-vision-tags-voodoo.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-voodoo-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-voodoo.log');

require('./apply-vision-tags-batch-b.js');
