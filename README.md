# webpack-ai-hmr-controller

一个用于解决在低配设备（如 16G 内存）上使用 Cline/Roo-Code 等 AI 辅助编程时，因频繁触发热更新导致内存溢出（OOM）的 Webpack 插件。

## 📦 安装

```bash
npm install webpack-ai-hmr-controller --save-dev
# 或者
yarn add webpack-ai-hmr-controller --dev
```

## 🚀 使用方法

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

插件支持以下配置：

```javascript
new AiHmrControllerPlugin({
  lockFileName: '.hmr-lock',
  pollInterval: 1000
});
```

### 2. 配置 NPM 脚本

在你的项目 `package.json` 中添加暂停和恢复的指令：

```json
{
  "scripts": {
    "dev": "ai-hmr-resume && vue-cli-service serve",
    "hmr:pause": "ai-hmr-pause",
    "hmr:resume": "ai-hmr-resume"
  }
}
```

### 3. 配置 Cline / AI 助手提示词

为了让 AI 自动控制热更新，请将以下指令复制到 Cline 的 **Custom Instructions**（自定义系统提示词）或项目根目录的 `.clinerules` 文件中：

```text
在这个项目中，为了防止 Webpack 频繁热更新导致内存溢出（OOM），请遵循以下规则：
1. 在你准备修改任何代码文件之前，必须优先执行一次终端命令: npm run hmr:pause
2. 当你完成所有文件的修改，并且用户在界面上同意（Accept）了你的修改、任务最终结束时，必须执行终端命令: npm run hmr:resume
```

## 工作原理

`ai-hmr-pause` 会在当前项目根目录创建 `.hmr-lock` 锁文件。Webpack 进入 watch 编译前，插件会检查该锁文件是否存在：

- 如果锁文件存在，插件会暂停本次编译并轮询等待。
- 如果锁文件被删除，插件会继续执行编译。
- `ai-hmr-resume` 会删除 `.hmr-lock` 锁文件，让 Webpack 恢复热更新。

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
