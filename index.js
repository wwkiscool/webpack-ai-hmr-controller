const fs = require('fs');
const path = require('path');

const DEFAULT_LOCK_FILE = '.hmr-lock';
const DEFAULT_POLL_INTERVAL = 500;
const DEFAULT_STABLE_DELAY = 1500;
const DEFAULT_MAX_PAUSE_TIME = 10 * 60 * 1000;

class AiHmrLockGuard {
  constructor(options = {}) {
    this.lockFileName = options.lockFileName || DEFAULT_LOCK_FILE;
    this.pollInterval = options.pollInterval || DEFAULT_POLL_INTERVAL;
    this.stableDelay = options.stableDelay || DEFAULT_STABLE_DELAY;
    this.maxPauseTime = options.maxPauseTime === undefined
      ? DEFAULT_MAX_PAUSE_TIME
      : options.maxPauseTime;
    this.waitingPromise = null;
  }

  getLockPath(root) {
    return path.resolve(root || process.cwd(), this.lockFileName);
  }

  isLocked(root) {
    return fs.existsSync(this.getLockPath(root));
  }

  waitForUnlock(root, bundlerName) {
    const lockPath = this.getLockPath(root);

    if (!fs.existsSync(lockPath)) {
      return Promise.resolve();
    }

    if (!this.waitingPromise) {
      this.waitingPromise = this.createUnlockPromise(lockPath, bundlerName).finally(() => {
        this.waitingPromise = null;
      });
    }

    return this.waitingPromise;
  }

  createUnlockPromise(lockPath, bundlerName) {
    return new Promise((resolve) => {
      console.log(`[AI-HMR] Lock file detected (${this.lockFileName}). ${bundlerName} updates are paused.`);

      const finish = () => {
        setTimeout(() => {
          console.log(`[AI-HMR] Quiet window elapsed (${this.stableDelay}ms). Resuming ${bundlerName} updates.`);
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

class AiHmrGuardWebpackPlugin {
  constructor(options = {}) {
    this.guard = new AiHmrLockGuard(options);
  }

  apply(compiler) {
    const projectRoot = compiler.options.context || process.cwd();

    compiler.hooks.watchRun.tapAsync('AiHmrGuardWebpackPlugin', (compiler, callback) => {
      if (!this.guard.isLocked(projectRoot)) {
        callback();
        return;
      }

      this.guard.waitForUnlock(projectRoot, 'Webpack').then(() => callback(), callback);
    });
  }
}

function viteAiHmrGuard(options = {}) {
  const guard = new AiHmrLockGuard(options);
  let root = process.cwd();
  let server = null;
  let resumePromise = null;
  let suppressedUpdates = 0;

  const scheduleResumeReload = () => {
    if (resumePromise) {
      return resumePromise;
    }

    resumePromise = guard.waitForUnlock(root, 'Vite').then(() => {
      if (server && suppressedUpdates > 0) {
        console.log(`[AI-HMR] Sending Vite full reload after suppressing ${suppressedUpdates} update(s).`);
        server.ws.send({ type: 'full-reload' });
      }

      suppressedUpdates = 0;
    }).finally(() => {
      resumePromise = null;
    });

    return resumePromise;
  };

  return {
    name: 'vite-ai-hmr-guard',
    apply: 'serve',
    configResolved(config) {
      root = config.root || process.cwd();
    },
    configureServer(viteServer) {
      server = viteServer;
    },
    handleHotUpdate() {
      if (!guard.isLocked(root)) {
        return;
      }

      suppressedUpdates += 1;
      scheduleResumeReload();
      return [];
    }
  };
}

module.exports = AiHmrGuardWebpackPlugin;
module.exports.AiHmrGuardWebpackPlugin = AiHmrGuardWebpackPlugin;
module.exports.AiHmrLockGuard = AiHmrLockGuard;
module.exports.viteAiHmrGuard = viteAiHmrGuard;
