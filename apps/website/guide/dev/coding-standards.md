# 代码风格规范

本文档定义了 MagicPush 项目的代码编写风格，包括注释规范、错误处理、异步编程等惯例。

---

## 目录

- [1. 注释规范](#1-注释规范)
- [2. 错误处理](#2-错误处理)
- [3. 异步编程](#3-异步编程)
- [4. 模块导入导出](#4-模块导入导出)
- [5. 日志规范](#5-日志规范)
- [6. 响应格式](#6-响应格式)
- [7. 静态检查（ESLint / Prettier）](#7-静态检查eslint--prettier)

---

## 1. 注释规范

### 1.1 类级注释 — JSDoc

```javascript
/**
 * 推送服务
 * 核心调度引擎：编排关键词过滤 → DND检查 → 遍历渠道 → 发送消息 → 记录日志的完整流程
 */
class PushService { }

/**
 * SMTP 邮件适配器
 * 通过 SMTP 协议发送邮件通知
 */
class SmtpChannel extends BaseChannel { }
```

### 1.2 方法级注释 — JSDoc（含参数说明）

```javascript
/**
 * 发送消息到指定渠道
 * @param {Object} message - 消息对象
 * @param {string} message.title - 消息标题
 * @param {string} message.content - 消息内容
 * @param {string} message.type - 消息类型: text / markdown / html
 * @param {string} [message.url] - 跳转链接（可选）
 * @returns {Promise<Object>} 发送结果 { success, messageId }
 * @throws {Error} 当渠道配置无效或发送失败时抛出
 */
async send(message) {
```

### 1.3 行内注释 — 中文简洁说明

```javascript
// 提取用户 ID
const userId = req.user.id;

// 检查是否在免打扰时段
if (doNotDisturbService.shouldMute(endpointId)) {
  // 记录跳过原因并返回
  return skippedResult;
}

// TODO: QQ 机器人渠道开发中，待测试后启用
// FIXME: 这里存在并发竞争问题，需要加锁
```

### 1.4 特殊标记

| 标记 | 用途 |
|------|------|
| `TODO` | 待完成的功能 |
| `FIXME` | 已知问题需要修复 |
| `HACK` | 临时 workaround |
| `NOTE` | 重要注意事项 |
| `DEPRECATED` | 已废弃的 API |

---

## 2. 错误处理

### 2.1 Controller 层 — try/catch + 统一响应

Controller 是请求处理的边界层，必须捕获所有异常并返回标准响应：

```javascript
static async getCurrentUser(req, res) {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return ResponseUtil.notFound(res, '用户不存在');
    }
    return ResponseUtil.success(res, {
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    return ResponseUtil.serverError(res, '获取用户信息失败');
  }
}
```

**要点：**
- 每个 Controller 方法都用 `try/catch` 包裹
- 业务错误用 `ResponseUtil.notFound()` / `ResponseUtil.badRequest()` 返回
- 异常用 `ResponseUtil.serverError()` 返回，不暴露内部细节
- 错误信息使用中文，面向用户友好

### 2.2 Service 层 — throw Error 向上抛出

Service 层不处理 HTTP 响应，通过抛出异常将错误传递给 Controller：

```javascript
class EndpointService {
  static async pushByToken(token, message, clientIp) {
    const endpoint = EndpointModel.findByToken(token);

    // 校验失败，直接抛异常（由 Controller 的 catch 捕获）
    if (!endpoint) {
      throw new Error('无效的接口令牌');
    }

    if (!endpoint.is_active) {
      throw new Error('该接口已被禁用');
    }

    // ... 继续业务逻辑
  }
}
```

**要点：**
- 参数校验不通过时 `throw new Error('中文描述')`
- 不在此层做 `try/catch`，让异常自然上浮到 Controller
- 错误消息使用中文，直接可展示给前端

### 2.3 全局错误中间件 — 兜底处理

```javascript
// apps/server/src/middleware/error.middleware.js
const errorMiddleware = (err, req, res, next) => {
  // 参数验证错误
  if (err.name === 'ValidationError') {
    return ResponseUtil.validationError(res, err.message);
  }

  // 数据库唯一约束冲突
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return ResponseUtil.conflict(res, '数据已存在');
  }

  // JWT 相关错误
  if (err.name === 'JsonWebTokenError') {
    return ResponseUtil.unauthorized(res, '无效的认证令牌');
  }
  if (err.name === 'TokenExpiredError') {
    return ResponseUtil.unauthorized(res, '认证令牌已过期');
  }

  // 兜底：服务器内部错误
  logger.error('未处理的异常:', err);
  return ResponseUtil.serverError(res, '服务器内部错误');
};
```

### 2.4 数据库迁移 — 静默忽略已存在的字段

```javascript
// apps/server/src/database/init.js
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
} catch (e) {
  // 字段已存在，忽略错误（正常情况）
}
```

---

## 3. 异步编程

### 3.1 后端 — async/await 为主

Controller 和 Service 层统一使用 `async/await`：

```javascript
class PushController {
  static async pushByToken(req, res) {
    try {
      const result = await PushService.pushByToken(
        req.params.token,
        req.body,
        req.ip
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      logger.error('推送失败:', error);
      return ResponseUtil.serverError(res, error.message);
    }
  }
}
```

### 3.2 Model 层 — 同步调用（better-sqlite3）

由于使用 `better-sqlite3`（同步 API），Model 层的方法是同步的：

```javascript
class EndpointModel {
  // 同步方法 - 直接返回结果
  static findByToken(token) {
    const stmt = db.prepare(
      'SELECT * FROM endpoints WHERE token = ? AND is_active = 1'
    );
    return stmt.get(token);  // 同步调用，无需 await
  }

  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO endpoints (user_id, name, token, description)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(data.userId, data.name, data.token, data.description);
    return { id: result.lastInsertRowid, ...data };
  }
}
```

> **注意**：Model 层返回的是普通对象/数组，Controller 中调用 Model 方法无需 `await`。

### 3.3 并行执行 — Promise.all / Promise.allSettled

当需要同时发送多个渠道消息时：

```javascript
// 并行发送到所有关联渠道（容忍单个失败）
const results = await Promise.allSettled(
  channels.map(channel => this._sendToChannel(channel, message))
);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    // 发送成功 → 记录 success 日志
  } else {
    // 发送失败 → 记录 failed 日志
  }
});
```

**选择策略：**

| 场景 | 使用方式 | 说明 |
|------|----------|------|
| 多个独立任务并行 | `Promise.all()` | 任一失败则全部失败 |
| 多个独立任务并行（容忍失败） | `Promise.allSettled()` | 返回每个任务的独立结果 |
| 串行依赖任务 | `await a(); await b();` | b 依赖 a 的结果 |

### 3.4 前端 — 完全 async/await

```javascript
const loginUser = async (credentials) => {
  try {
    const res = await login(credentials);
    if (res.success) {
      accessToken.value = res.data.accessToken;
      refreshToken.value = res.data.refreshToken;
      localStorage.setItem('accessToken', res.data.accessToken);
    }
    return res;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
};
```

---

## 4. 模块导入导出

### 4.1 后端 (CommonJS)

```javascript
// 导入
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const BaseChannel = require('./base.channel');
const { UserModel, ChannelModel } = require('../models');
const logger = require('../utils/logger');
const ResponseUtil = require('../utils/response');

// 导出 - 单个类
module.exports = UserController;

// 导出 - 多个对象
module.exports = {
  errorMiddleware,
  notFoundMiddleware,
  getChannelAdapter,
  validateChannelConfig,
};
```

**导入顺序约定：**

```javascript
// 1. Node.js 内置模块
const path = require('path');

// 2. 第三方 npm 包
const express = require('express');
const jwt = require('jsonwebtoken');

// 3. 内部模块（相对路径）
const logger = require('../utils/logger');
const { UserModel } = require('../models');
const BaseChannel = require('./base.channel');
```

### 4.2 前端 (ES Modules)

```javascript
// Vue 核心
import { createApp, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// 第三方库
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 项目内部（@/ 别名指向 src/）
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/components/Layout/MainLayout.vue'
import { login, register } from '@/api/auth'
import request from '@/utils/request'

// 导出
export const useAuthStore = defineStore('auth', () => { ... })
export default router
export function formatDate(date) { ... }
export { getCurrentUser, updateUser }
```

---

## 5. 日志规范

### 5.1 使用 Winston Logger

```javascript
const logger = require('../utils/logger');
```

### 5.2 级别选择

| 级别 | 场景 | 示例 |
|------|------|------|
| `logger.error()` | 错误 + 异常堆栈 | `logger.error('数据库查询失败:', error)` |
| `logger.warn()` | 可预期的异常情况 | `logger.warn('用户登录失败:', username)` |
| `logger.info()` | 关键业务节点 | `logger.info(\`推送成功: \${endpointName} → \${channelType}\`)` |
| `logger.debug()` | 开发调试信息 | `logger.debug('请求参数:', req.body)` |

### 5.3 日志格式要求

```javascript
// 正确：包含上下文信息
logger.error('推送失败:', { endpointId, channelType, error: error.message });

// 正确：关键操作记录
logger.info(`用户 ${username} 创建新渠道: ${channelType}`);

// 禁止：无意义日志
logger.log('here');           // 禁止
console.log('debug');         // 生产代码禁止使用 console.log/console.error
```

---

## 6. 响应格式

所有 API 统一使用 `ResponseUtil` 工具类返回标准 JSON 格式：

### 6.1 成功响应

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": { ... },
  "timestamp": 1704067200000
}
```

### 6.2 错误响应

```json
{
  "success": false,
  "code": 400,
  "message": "参数验证失败",
  "data": null,
  "timestamp": 1704067200000
}
```

### 6.3 推送专用响应

推送 API 使用特殊的聚合结果格式：

```json
{
  "success": true,
  "total": 3,
  "successCount": 2,
  "failedCount": 1,
  "results": [
    { "success": true, "channelId": 1, "channelType": "telegram", "logId": 101 },
    { "success": true, "channelId": 2, "channelType": "bark", "logId": 102 },
    { "success": false, "channelId": 3, "channelType": "feishu", "error": "Webhook 超时" }
  ]
}
```

### 6.4 ResponseUtil 方法列表

| 方法 | HTTP 状态码 | 用途 |
|------|-------------|------|
| `ResponseUtil.success(res, data)` | 200 | 成功响应 |
| `ResponseUtil.created(res, data)` | 201 | 创建成功 |
| `ResponseUtil.noContent(res)` | 204 | 删除成功（无返回体） |
| `ResponseUtil.badRequest(res, message)` | 400 | 参数错误 |
| `ResponseUtil.unauthorized(res, message)` | 401 | 未认证 |
| `ResponseUtil.forbidden(res, message)` | 403 | 无权限 |
| `ResponseUtil.notFound(res, message)` | 404 | 资源不存在 |
| `ResponseUtil.conflict(res, message)` | 409 | 资源冲突 |
| `ResponseUtil.validationError(res, message)` | 422 | 验证错误 |
| `ResponseUtil.serverError(res, message)` | 500 | 服务器内部错误 |

---

## 7. 静态检查（ESLint / Prettier）

项目通过 [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) 在合入前统一风格、捕获低级错误（未定义变量、重复声明、无效转义、不可达分支等）。相关配置位于仓库根目录：

| 文件 | 作用 |
|------|------|
| `package.json`（根） | 提供 `lint` / `lint:fix` / `format` / `format:check` 脚本与共享 devDependencies |
| `eslint.config.js` | ESLint 扁平配置：JS 用 `eslint:recommended`，Vue 用 `vue/essential`（仅捕获错误，不强制模板风格）；`apps/server/` 按 CommonJS，其余按 ESM |
| `.prettierrc.json` | Prettier 配置（前端默认无分号，`apps/server/` 覆盖为带分号） |
| `.prettierignore` | 忽略构建产物与锁文件 |

### 7.1 常用命令

在仓库根目录执行：

```bash
pnpm lint          # 运行 ESLint，检查全部源码
pnpm lint:fix      # 自动修复可修复的问题（如无效转义、case 块作用域）
pnpm format        # 用 Prettier 格式化全部文件
pnpm format:check  # 仅检查格式，不修改
```

### 7.2 约定

- ESLint 以**错误（error）级别**捕获真实问题，CI 中 `lint` 任务失败会阻断合入；未使用变量等以**警告（warning）**呈现，不阻断。
- 风格统一交由 Prettier 负责，提交前建议运行 `pnpm format`；不要在 ESLint 中重复配置风格规则。
- CI（`.github/workflows/ci.yml`）的 `lint` 任务会在 PR / push 到 `main`、`dev` 时自动运行 `pnpm lint`，作为合入门禁。

