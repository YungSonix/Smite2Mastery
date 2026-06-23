#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Tales of Arabia.json only.
 *
 * Input: scripts/god-renders/.vision-tag-tales-of-arabia-data.json
 * Log:   scripts/god-renders/.vision-tag-tales-of-arabia.log
 *
 *   node scripts/god-renders/apply-vision-tags-tales-of-arabia.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-tales-of-arabia-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-tales-of-arabia.log');

require('./apply-vision-tags-batch-b.js');
