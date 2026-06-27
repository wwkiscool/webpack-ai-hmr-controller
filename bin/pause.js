#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const lockFileName = '.hmr-lock';
const lockPath = path.resolve(process.cwd(), lockFileName);

try {
  fs.writeFileSync(lockPath, '');
  console.log('⏸️  [AI-HMR] HMR 已成功暂停 (锁文件已创建).');
} catch (err) {
  console.error('❌ [AI-HMR] 暂停失败:', err.message);
  process.exitCode = 1;
}
