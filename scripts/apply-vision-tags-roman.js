#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Roman.json only.
 *
 * Input: scripts/.vision-tag-roman-data.json
 * Log:   scripts/.vision-tag-roman.log
 *
 *   node scripts/apply-vision-tags-roman.js [--write]
 */
'use strict';

const { PROJECT_ROOT } = require('../config/dataPaths');

process.argv.push('--data=scripts/.vision-tag-roman-data.json');
process.argv.push('--log=scripts/.vision-tag-roman.log');

require('./apply-vision-tags-batch-b.js');
