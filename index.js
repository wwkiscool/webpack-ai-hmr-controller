const fs = require('fs');
const path = require('path');

class AiHmrControllerPlugin {
  constructor(options = {}) {
    this.lockFileName = options.lockFileName || '.hmr-lock';
    this.pollInterval = options.pollInterval || 1000;
  }

  apply(compiler) {
    const projectRoot = compiler.options.context || process.cwd();
    const lockPath = path.resolve(projectRoot, this.lockFileName);

    compiler.hooks.watchRun.tapAsync('AiHmrControllerPlugin', (compiler, callback) => {
      if (fs.existsSync(lockPath)) {
        console.log(`\n⚠️  [AI-HMR] 检测到锁文件 (${this.lockFileName})，已暂停编译。等待 AI 修改完成...`);

        const interval = setInterval(() => {
          if (!fs.existsSync(lockPath)) {
            clearInterval(interval);
            console.log('\n🚀 [AI-HMR] 锁文件已清除，开始编译最新代码...');
            callback();
          }
        }, this.pollInterval);
      } else {
        callback();
      }
    });
  }
}

module.exports = AiHmrControllerPlugin;
