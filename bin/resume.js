#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const lockFileName = process.env.AI_HMR_LOCK_FILE || '.hmr-lock';
const lockPath = path.resolve(process.cwd(), lockFileName);

try {
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
    console.log(`[AI-HMR] HMR resumed. Lock file removed: ${lockFileName}`);
  } else {
    console.log(`[AI-HMR] HMR already resumed. Lock file does not exist: ${lockFileName}`);
  }
} catch (err) {
  console.error(`[AI-HMR] Failed to resume HMR: ${err.message}`);
  process.exitCode = 1;
}
