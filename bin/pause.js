#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const lockFileName = process.env.AI_HMR_LOCK_FILE || '.hmr-lock';
const lockPath = path.resolve(process.cwd(), lockFileName);

const lockData = {
  createdAt: Date.now(),
  createdAtIso: new Date().toISOString(),
  pid: process.pid
};

try {
  fs.writeFileSync(lockPath, `${JSON.stringify(lockData, null, 2)}\n`);
  console.log(`[AI-HMR] HMR paused. Lock file created: ${lockFileName}`);
} catch (err) {
  console.error(`[AI-HMR] Failed to pause HMR: ${err.message}`);
  process.exitCode = 1;
}
