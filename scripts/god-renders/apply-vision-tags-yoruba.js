#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Yoruba.json only.
 *
 * Input: scripts/god-renders/.vision-tag-yoruba-data.json
 * Log:   scripts/god-renders/.vision-tag-yoruba.log
 *
 *   node scripts/god-renders/apply-vision-tags-yoruba.js [--write]
 */
'use strict';

process.argv.push('--data=scripts/god-renders/.vision-tag-yoruba-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-yoruba.log');

require('./apply-vision-tags-batch-b.js');
