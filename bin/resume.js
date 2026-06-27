#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const lockFileName = '.hmr-lock';
const lockPath = path.resolve(process.cwd(), lockFileName);

try {
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
  }
  console.log('▶️  [AI-HMR] HMR 已成功恢复 (锁文件已清除).');
} catch (err) {
  console.error('❌ [AI-HMR] 恢复失败:', err.message);
  process.exitCode = 1;
}
