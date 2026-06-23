#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Norse.json only.
 *
 * Input: scripts/god-renders/.vision-tag-norse-data.json
 * Log:   scripts/god-renders/.vision-tag-norse.log
 *
 *   node scripts/god-renders/apply-vision-tags-norse.js [--write]
 */
'use strict';

const { PROJECT_ROOT } = require('../../config/dataPaths');

process.argv.push('--data=scripts/god-renders/.vision-tag-norse-data.json');
process.argv.push('--log=scripts/god-renders/.vision-tag-norse.log');

require('./apply-vision-tags-batch-b.js');
