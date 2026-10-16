# 测试指南

本文档说明 MagicPush 后端的测试体系：如何运行测试、测试目录与命名约定、Mock 规范，以及新增渠道/模块测试的标准范式。测试框架基于 **Node 20 内置的 `node:test`**，零运行时依赖，不影响生产环境。

---

## 目录

- [1. 为什么需要测试](#1-为什么需要测试)
- [2. 运行命令](#2-运行命令)
- [3. 目录结构与命名约定](#3-目录结构与命名约定)
- [4. 测试范式（node:test）](#4-测试范式node-test)
- [5. Mock 规范](#5-mock-规范)
- [6. 编写新渠道测试（参照 Meow 范式）](#6-编写新渠道测试参照-meow-范式)
- [7. 覆盖率](#7-覆盖率)
- [8. 路线图（P1/P2）](#8-路线图p1p2)
- [9. 前端测试（Vitest）](#9-前端测试vitest)

---

## 1. 为什么需要测试

测试框架是一套**自动化质检流水线**：你提前写好"给定输入 A，必须返回 B"的用例，框架自动运行并比对结果。

- **防回归**：改代码或重构时，一键 `pnpm test` 即可知道是否破坏了旧功能（例如曾出现"业务状态码 400 被误判为推送成功"的 bug，已被测试覆盖）。
- **可充当文档**：测试即真实用法示例，比注释更可靠。
- **对生产零影响**：测试代码只在 `tests/` 目录，线上服务只加载 `src/app.js`，测试不参与启动；Docker 构建使用 `pnpm install --prod` 自动排除 `devDependencies`，测试依赖不会进入生产镜像。

> 红线：测试**绝不连接真实外部服务**（微信 / Meow 服务器等），一律使用 Mock 假数据，避免误发真实推送。

---

## 2. 运行命令

在 `apps/server/` 目录下执行：

```bash
# 运行全部测试（递归扫描 tests/ 下所有 *.test.js）
pnpm test

# 等价于
node --test tests

# 查看覆盖率（Node 20 内置，零额外依赖）
pnpm test:coverage

# 监听模式，文件变更自动重跑（开发时）
pnpm test:watch
```

依赖说明：项目已在 `apps/server/package.json` 新增以下脚本：

```json
"scripts": {
  "test": "node --test tests",
  "test:coverage": "node --test --experimental-test-coverage tests",
  "test:watch": "node --test --watch tests"
}
```

---

## 3. 目录结构与命名约定

```text
apps/server/tests/
├── unit/                      # 单元测试（本期重点）
│   ├── channels/
│   │   ├── meow.channel.test.js        # axios mock 范式
│   │   ├── base.channel.test.js        # stripHtmlTags / createProxyAgent
│   │   ├── bark.channel.test.js        # axios mock（markdown/html 转换）
│   │   ├── serverchan.channel.test.js  # axios mock（Turbo/³ 双版本）
│   │   ├── webhook.channel.test.js     # axios mock（模板渲染/校验）
│   │   ├── dingtalk.channel.test.js    # axios mock（text/markdown、加签 URL）
│   │   ├── wecom.channel.test.js       # axios mock（8 种消息类型、html 降级）
│   │   └── feishu.channel.test.js      # axios mock（text/markdown 卡片、签名）
│   ├── services/
│   │   ├── keywordFilter.service.test.js
│   │   ├── doNotDisturb.service.test.js   # 时段命中/校验（替换 _getMinutesOfDay）
│   │   ├── rateLimitConfig.service.test.js # Mock settings.model
│   │   └── xiaomi-auth.service.test.js     # crypto 签名/会话（RC4 环境相关）
│   └── utils/
│       ├── response.test.js
│       ├── token.test.js
│       └── jsonpath.test.js           # getValue / extractFields / 预设模板
└── integration/               # 集成测试（后续扩展，本期留空占位）
```

约定：

- 所有测试文件以 `*.test.js` 结尾，`node --test tests` 会自动递归识别。
- 按被测试模块所处的源码目录（`channels` / `services` / `utils`）分目录存放，便于定位。
- 测试文件内 `require` 源码使用相对路径（从 `tests/unit/<group>/` 到 `src/` 需上溯三级：`require('../../../src/...')`）。

---

## 4. 测试范式（node:test）

使用 Node 内置的 `node:test` 与 `node:assert`，风格与现有测试一致：

```js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

const SomeService = require('../../../src/services/some.service');

// 每个用例前重置状态，避免相互污染
beforeEach(() => {
  // 重置共享状态
});

test('用例描述：给定 X 应返回 Y', () => {
  assert.deepStrictEqual(SomeService.doSomething(), expected);
});

test('异步用例：业务状态码非 200 应抛错', async () => {
  await assert.rejects(
    () => someAsyncCall(),
    /错误信息关键字/
  );
});
```

要点：

- 用 `test(name, fn)` 声明用例，无需自写运行器。
- 异步用例 `fn` 用 `async`，断言用 `await assert.rejects(...)` / `assert.doesNotReject(...)`。
- 共享状态隔离用 `beforeEach`（每个用例前执行）；文件级一次性准备用 `before`。

---

## 5. Mock 规范

### 5.1 网络依赖（axios 类）

沿用项目既有方式：在 `require` 目标模块**之前**，覆盖 `require.cache` 中 axios 的解析结果，注入假实现：

```js
const axiosMock = {
  post(url, body, config) {
    lastPost = { url, body, config };
    return Promise.resolve({ data: { status: 200, message: '推送成功' } });
  },
};
const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: axiosMock,
};

const MeowChannel = require('../../../src/services/channels/meow.channel');
```

> 该方式在 Node 20 下稳定可用，比 `MockModule` 更直观，且不引入额外依赖。

### 5.2 HTTP 响应（res 对象）

用普通对象自建轻量 mock，捕获 `status` / `json` 调用结果：

```js
function createMockRes() {
  const captured = { statusCode: null, body: null };
  const res = {
    status(code) { captured.statusCode = code; return res; },
    json(payload) { captured.body = payload; return res; },
  };
  return { res, captured };
}
```

### 5.3 数据库 / 密钥依赖

- 通过环境变量绕过数据库，例如 `TokenUtil` 测试前设置 `process.env.JWT_SECRET = 'test-secret'`，避免触达 SQLite。
- 涉及 DB 的 service 可注入假 `db`，或在 `require` 目标模块**之前**覆盖 `require.cache` 中对应的 model 实现（例如 `rateLimitConfig.service.test.js` 即覆盖了 `settings.model`），从而隔离数据库依赖。
- 第三方 SDK（如 `nodemailer`）同样可用 `require.cache` 覆盖：替换为返回假 transport 的对象，断言其 `sendMail` 收到的入参（如 `smtp.channel.test.js`）。

> 注意：`xiaomi-auth.service.js` 在加载时会启动一个会话清理 `setInterval`，为避免其挂起测试进程，该测试文件在 `require` 前将 `global.setInterval` 临时置为 no-op，加载后恢复。

---

## 6. 编写新渠道测试（参照 Meow 范式）

新增渠道适配器后，建议在 `tests/unit/channels/` 下建立 `<channel>.channel.test.js`，参照 `meow.channel.test.js` 覆盖以下维度：

1. `getSupportedTypes()` / `getChannelSpecificTypes()` 返回值。
2. 通用分支：各消息类型（text/markdown/html）的原生透传行为。
3. 渠道特有参数（如 `url` / `htmlHeight`）是否正确合并与生效条件。
4. 业务状态码非 200 时是否抛出明确错误（防误报成功）。
5. 非法输入（如未知类型、参数校验）是否抛错。
6. `validate()` 的边界值（必填项、格式、范围）。

复制 `meow.channel.test.js` 的 axios mock 注入骨架，替换断言即可。

---

## 7. 覆盖率

`pnpm test:coverage` 使用 Node 20 内置 `--experimental-test-coverage`，输出文本摘要（行 / 分支 / 函数覆盖率及未覆盖行号），无需任何额外依赖。

- 覆盖率产物目录（`.node-coverage/`、`coverage/` 等）已写入根 `.gitignore`，不提交、不打包。
- 如需生成 **HTML / lcov** 报告，可选择性将极轻量的 `c8` 加入 `devDependencies`（不进生产镜像），执行：
  ```bash
  npx c8 --reporter=text --reporter=lcov node --test tests
  ```

---

## 8. 路线图（P1/P2）

- **P1（业务 service / 更多渠道）**：`jsonpath.js`、`doNotDisturb.service.js`、`rateLimitConfig.service.js`、`xiaomi-auth.service.js` 及 `bark` / `serverchan` / `webhook` / `smtp` / `dingtalk` / `wecom` / `feishu` 渠道测试**已完成**；剩余 `channel.service.js`、`push.service.js`，以及 telegram / gotify / ntfy 等渠道可继续按 Meow 范式补齐。
- **P2（集成测试）**：`controllers` / `routes` 集成测试（启动 `app` 或 mock `req/res`，验证端到端行为）可继续补齐；**GitHub Actions CI 已完成**——`.github/workflows/ci.yml` 在 PR / push 到 `main`、`dev` 时，分别运行 `server` 的 `node --test` 与 `web` 的 `vitest`，作为合入门禁（详见 [第 9 节](#9-前端测试vitest)）。

---

## 9. 前端测试（Vitest）

前端 `apps/web/` 已引入 [Vitest](https://vitest.dev/) 作为单元测试框架，运行于 `jsdom` 环境（store 依赖 `localStorage`）。

### 9.1 运行命令

在 `apps/web/` 目录下执行：

```bash
pnpm test          # 运行全部测试（等价于 vitest run）
pnpm test:watch    # 监听模式，文件变更自动重跑（开发时）
```

### 9.2 目录与命名约定

```text
apps/web/src/stores/
├── auth.js
├── settings.js
├── auth.spec.js        # auth store 单测
└── settings.spec.js    # settings store 单测
```

- 测试文件以 `*.spec.js` 结尾，`vitest.config.js` 的 `include` 默认扫描 `src/**/*.spec.js`。
- store 测试通过 `setActivePinia(createPinia())` 创建独立 Pinia 实例，并在 `beforeEach` 中 `localStorage.clear()` 隔离状态。
- 对 `@/api/auth`、`@/utils/request` 等外部依赖使用 `vi.mock(...)` 注入假实现，避免触达真实网络与 UI 依赖。

### 9.3 配置

`apps/web/vitest.config.js` 复用 `vite.config.js` 的 `@` 别名，并启用 `environment: 'jsdom'`：

```js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.js'],
  },
})
```

> 新增 store / 工具函数时，建议在同目录新增对应的 `*.spec.js`，覆盖核心分支（成功 / 失败 / 边界），与后端测试一样遵循"绝不连接真实外部服务"的红线（统一用 Mock）。
