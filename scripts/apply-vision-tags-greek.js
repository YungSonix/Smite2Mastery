#!/usr/bin/env node
/**
 * Apply vision-tagged extractions to Greek.json only.
 *
 * Input: scripts/.vision-tag-greek-data.json
 * Log:   scripts/.vision-tag-greek.log
 *
 *   node scripts/apply-vision-tags-greek.js [--write]
 */
'use strict';

const path = require('path');
const { PROJECT_ROOT } = require('../config/dataPaths');

process.argv.push('--data=scripts/.vision-tag-greek-data.json');
process.argv.push('--log=scripts/.vision-tag-greek.log');

require('./apply-vision-tags-batch-b.js');
