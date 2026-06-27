const fs = require('fs');
const path = require('path');

const DEFAULT_LOCK_FILE = '.hmr-lock';
const DEFAULT_POLL_INTERVAL = 500;
const DEFAULT_STABLE_DELAY = 1500;
const DEFAULT_MAX_PAUSE_TIME = 10 * 60 * 1000;

class AiHmrControllerPlugin {
  constructor(options = {}) {
    this.lockFileName = options.lockFileName || DEFAULT_LOCK_FILE;
    this.pollInterval = options.pollInterval || DEFAULT_POLL_INTERVAL;
    this.stableDelay = options.stableDelay || DEFAULT_STABLE_DELAY;
    this.maxPauseTime = options.maxPauseTime === undefined
      ? DEFAULT_MAX_PAUSE_TIME
      : options.maxPauseTime;
    this.waitingPromise = null;
  }

  apply(compiler) {
    const projectRoot = compiler.options.context || process.cwd();
    const lockPath = path.resolve(projectRoot, this.lockFileName);

    compiler.hooks.watchRun.tapAsync('AiHmrControllerPlugin', (compiler, callback) => {
      if (!fs.existsSync(lockPath)) {
        callback();
        return;
      }

      if (!this.waitingPromise) {
        this.waitingPromise = this.waitForUnlock(lockPath).finally(() => {
          this.waitingPromise = null;
        });
      }

      this.waitingPromise.then(() => callback(), callback);
    });
  }

  waitForUnlock(lockPath) {
    return new Promise((resolve) => {
      console.log(`[AI-HMR] Lock file detected (${this.lockFileName}). Webpack compilation is paused.`);

      const finish = () => {
        setTimeout(() => {
          console.log(`[AI-HMR] Quiet window elapsed (${this.stableDelay}ms). Resuming compilation.`);
          resolve();
        }, this.stableDelay);
      };

      const interval = setInterval(() => {
        if (!fs.existsSync(lockPath)) {
          clearInterval(interval);
          console.log('[AI-HMR] Lock file removed. Waiting for file system to settle...');
          finish();
          return;
        }

        if (this.isLockStale(lockPath)) {
          clearInterval(interval);
          console.warn(`[AI-HMR] Lock file exceeded maxPauseTime (${this.maxPauseTime}ms). Auto-resuming.`);
          this.removeStaleLock(lockPath);
          finish();
        }
      }, this.pollInterval);
    });
  }

  isLockStale(lockPath) {
    if (!this.maxPauseTime || this.maxPauseTime <= 0) {
      return false;
    }

    return Date.now() - this.getLockCreatedAt(lockPath) >= this.maxPauseTime;
  }

  getLockCreatedAt(lockPath) {
    try {
      const content = fs.readFileSync(lockPath, 'utf8');
      const data = JSON.parse(content);

      if (data && Number.isFinite(data.createdAt)) {
        return data.createdAt;
      }
    } catch (err) {
      // Older lock files may be empty. Fall back to mtime for compatibility.
    }

    try {
      return fs.statSync(lockPath).mtimeMs;
    } catch (err) {
      return Date.now();
    }
  }

  removeStaleLock(lockPath) {
    try {
      fs.unlinkSync(lockPath);
    } catch (err) {
      console.warn(`[AI-HMR] Failed to remove stale lock file: ${err.message}`);
    }
  }
}

module.exports = AiHmrControllerPlugin;
