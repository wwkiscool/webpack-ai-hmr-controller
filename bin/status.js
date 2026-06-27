#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const lockFileName = process.env.AI_HMR_LOCK_FILE || '.hmr-lock';
const lockPath = path.resolve(process.cwd(), lockFileName);

if (!fs.existsSync(lockPath)) {
  console.log(`[AI-HMR] Status: running. Lock file does not exist: ${lockFileName}`);
  process.exit(0);
}

const createdAt = getLockCreatedAt(lockPath);
const ageSeconds = Math.round((Date.now() - createdAt) / 1000);

console.log(`[AI-HMR] Status: paused. Lock file: ${lockFileName}`);
console.log(`[AI-HMR] Created at: ${new Date(createdAt).toISOString()}`);
console.log(`[AI-HMR] Paused for: ${ageSeconds}s`);

function getLockCreatedAt(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    if (data && Number.isFinite(data.createdAt)) {
      return data.createdAt;
    }
  } catch (err) {
    // Empty lock files from older versions are still valid.
  }

  try {
    return fs.statSync(filePath).mtimeMs;
  } catch (err) {
    return Date.now();
  }
}
