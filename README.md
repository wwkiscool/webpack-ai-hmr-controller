# webpack-ai-hmr-controller

一个用于解决在低配设备（如 16G 内存）上使用 Cline/Roo-Code 等 AI 辅助编程时，因频繁触发 Webpack 热更新导致内存溢出（OOM）的插件。

它通过“锁文件 + 安静窗口 + 过期锁自动恢复”的方式，让 AI 批量修改代码时暂停 HMR，等修改完成并且文件系统稳定后再恢复编译。

## 安装

```bash
npm install webpack-ai-hmr-controller --save-dev
# 或者
yarn add webpack-ai-hmr-controller --dev
```

## 使用方法

### 1. 注册 Webpack 插件

在 `vue.config.js`（或者其他 Webpack 配置文件）中引入并注册：

```javascript
const AiHmrControllerPlugin = require('webpack-ai-hmr-controller');

module.exports = {
  configureWebpack: {
    plugins: [
      new AiHmrControllerPlugin()
    ]
  }
};
```

推荐配置：

```javascript
new AiHmrControllerPlugin({
  lockFileName: '.hmr-lock',
  pollInterval: 500,
  stableDelay: 1500,
  maxPauseTime: 10 * 60 * 1000
});
```

配置说明：

- `lockFileName`：锁文件名，默认 `.hmr-lock`
- `pollInterval`：检测锁文件是否消失的间隔，默认 `500ms`
- `stableDelay`：锁文件删除后继续等待的安静窗口，默认 `1500ms`
- `maxPauseTime`：最长暂停时间，默认 `10 分钟`；设置为 `0` 可关闭自动恢复

### 2. 配置 NPM 脚本

在你的项目 `package.json` 中添加暂停、恢复和状态查看指令：

```json
{
  "scripts": {
    "dev": "ai-hmr-resume && vue-cli-service serve",
    "hmr:pause": "ai-hmr-pause",
    "hmr:resume": "ai-hmr-resume",
    "hmr:status": "ai-hmr-status"
  }
}
```

### 3. 配置 Cline / AI 助手提示词

为了让 AI 自动控制热更新，请将以下指令复制到 Cline 的 **Custom Instructions**（自定义系统提示词）或项目根目录的 `.clinerules` 文件中：

```text
在这个项目中，为了防止 Webpack 频繁热更新导致内存溢出（OOM），请遵循以下规则：
1. 在你准备修改任何代码文件之前，必须优先执行一次终端命令: npm run hmr:pause
2. 修改多个文件时，只需要在开始前 pause 一次，不要每改一个文件就 resume
3. 当你完成所有文件修改、格式化和必要验证后，必须执行终端命令: npm run hmr:resume
4. 如果不确定当前 HMR 是否处于暂停状态，可以执行终端命令: npm run hmr:status
```

## 工作原理

`ai-hmr-pause` 会在当前项目根目录创建 `.hmr-lock` 锁文件，锁文件中包含创建时间、ISO 时间和进程 ID。

Webpack 进入 watch 编译前，插件会检查锁文件：

- 如果锁文件不存在，正常编译。
- 如果锁文件存在，暂停本次编译并轮询等待。
- 如果锁文件被删除，插件会继续等待 `stableDelay`，让 AI 写文件、格式化、保存等操作彻底结束。
- 如果锁文件存在时间超过 `maxPauseTime`，插件会认为它已经过期，自动恢复编译，避免死锁。

## 命令

```bash
npx ai-hmr-pause
npx ai-hmr-resume
npx ai-hmr-status
```

如果你使用了自定义锁文件名，也可以通过环境变量让命令行脚本保持一致：

```bash
AI_HMR_LOCK_FILE=.custom-hmr-lock npx ai-hmr-pause
AI_HMR_LOCK_FILE=.custom-hmr-lock npx ai-hmr-resume
AI_HMR_LOCK_FILE=.custom-hmr-lock npx ai-hmr-status
```

## 发布到 npm

1. 注册 npm 账号：访问 [npmjs.com](https://www.npmjs.com/) 注册。
2. 在包目录下登录：

```bash
npm login
```

3. 发布包：

```bash
npm publish
```

如果是 scoped package 或遇到访问权限问题，可以尝试：

```bash
npm publish --access public
```

发布成功后，其他开发者就可以通过 `npm install webpack-ai-hmr-controller` 直接安装使用。
