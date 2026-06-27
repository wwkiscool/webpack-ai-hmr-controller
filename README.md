# ai-hmr-guard

一个同时支持 Webpack 和 Vite 的 HMR 保护插件，用于解决在低配设备（如 16G 内存）上使用 Cline/Roo-Code 等 AI 辅助编程时，因为频繁触发热更新导致内存溢出（OOM）或开发服务卡死的问题。

它通过“锁文件 + 安静窗口 + 过期锁自动恢复”的方式，让 AI 批量修改代码时暂停 HMR，等修改完成并且文件系统稳定后再恢复更新。

## 安装

```bash
npm install ai-hmr-guard --save-dev
# 或者
yarn add ai-hmr-guard --dev
```

## Webpack 使用方法

在 `vue.config.js`、`webpack.config.js` 或其他 Webpack 配置文件中注册：

```javascript
const AiHmrGuardWebpackPlugin = require('ai-hmr-guard');

module.exports = {
  configureWebpack: {
    plugins: [
      new AiHmrGuardWebpackPlugin()
    ]
  }
};
```

推荐配置：

```javascript
new AiHmrGuardWebpackPlugin({
  lockFileName: '.hmr-lock',
  pollInterval: 500,
  stableDelay: 1500,
  maxPauseTime: 10 * 60 * 1000
});
```

Webpack 行为：

- 锁文件存在时，暂停本次 watch 编译。
- 锁文件删除后，继续等待 `stableDelay`。
- 安静窗口结束后，恢复本次编译。
- 锁文件超过 `maxPauseTime` 后，会自动删除并恢复，避免死锁。

## Vite 使用方法

### CommonJS 配置

```javascript
const { viteAiHmrGuard } = require('ai-hmr-guard');

module.exports = {
  plugins: [
    viteAiHmrGuard()
  ]
};
```

也可以使用子路径入口：

```javascript
const viteAiHmrGuard = require('ai-hmr-guard/vite');

module.exports = {
  plugins: [
    viteAiHmrGuard()
  ]
};
```

### ESM 配置

```javascript
import viteAiHmrGuard from 'ai-hmr-guard/vite';

export default {
  plugins: [
    viteAiHmrGuard()
  ]
};
```

推荐配置：

```javascript
viteAiHmrGuard({
  lockFileName: '.hmr-lock',
  pollInterval: 500,
  stableDelay: 1500,
  maxPauseTime: 10 * 60 * 1000
});
```

Vite 行为：

- 锁文件存在时，Vite 的 HMR 更新会被抑制，不推送到浏览器。
- 插件会等待锁文件删除。
- 锁文件删除后，继续等待 `stableDelay`。
- 安静窗口结束后，如果期间抑制过更新，会向浏览器发送一次 `full-reload`。
- 锁文件超过 `maxPauseTime` 后，会自动删除并恢复，避免死锁。

## 配置 NPM 脚本

在业务项目的 `package.json` 中添加暂停、恢复和状态查看指令：

```json
{
  "scripts": {
    "hmr:pause": "ai-hmr-pause",
    "hmr:resume": "ai-hmr-resume",
    "hmr:status": "ai-hmr-status"
  }
}
```

你也可以在启动开发服务前先恢复一次，避免上次异常退出留下锁文件：

```json
{
  "scripts": {
    "dev": "ai-hmr-resume && vite",
    "dev:webpack": "ai-hmr-resume && vue-cli-service serve"
  }
}
```

## 配置 Cline / AI 助手提示词

为了让 AI 自动保护热更新，请将以下指令复制到 Cline 的 **Custom Instructions**（自定义系统提示词）或项目根目录的 `.clinerules` 文件中：

```text
在这个项目中，为了防止 Webpack/Vite 频繁热更新导致内存溢出（OOM）或开发服务卡死，请遵循以下规则：
1. 在你准备修改任何代码文件之前，必须优先执行一次终端命令: npm run hmr:pause
2. 修改多个文件时，只需要在开始前 pause 一次，不要每改一个文件就 resume
3. 当你完成所有文件修改、格式化和必要验证后，必须执行终端命令: npm run hmr:resume
4. 如果不确定当前 HMR 是否处于暂停状态，可以执行终端命令: npm run hmr:status
```

## 命令

```bash
npx ai-hmr-pause
npx ai-hmr-resume
npx ai-hmr-status
```

`ai-hmr-pause` 会在当前项目根目录创建 `.hmr-lock`，其中包含创建时间、ISO 时间和进程 ID。

如果你使用了自定义锁文件名，也可以通过环境变量让命令行脚本保持一致：

```bash
AI_HMR_LOCK_FILE=.custom-hmr-lock npx ai-hmr-pause
AI_HMR_LOCK_FILE=.custom-hmr-lock npx ai-hmr-resume
AI_HMR_LOCK_FILE=.custom-hmr-lock npx ai-hmr-status
```

Windows PowerShell 写法：

```powershell
$env:AI_HMR_LOCK_FILE='.custom-hmr-lock'
npx ai-hmr-pause
```

## 发布到 npm

```bash
npm login
npm publish
```

如果是 scoped package 或遇到访问权限问题，可以尝试：

```bash
npm publish --access public
```
