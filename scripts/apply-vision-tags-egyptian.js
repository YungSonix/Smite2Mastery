#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Egyptian.json only.
 *
 * Input: scripts/.vision-tag-egyptian-data.json
 * Log:   scripts/.vision-tag-egyptian.log
 *
 *   node scripts/apply-vision-tags-egyptian.js [--write]
 */
'use strict';

const { PROJECT_ROOT } = require('../config/dataPaths');

process.argv.push('--data=scripts/.vision-tag-egyptian-data.json');
process.argv.push('--log=scripts/.vision-tag-egyptian.log');

require('./apply-vision-tags-batch-b.js');
