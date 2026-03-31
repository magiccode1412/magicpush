# API 请求频率限制 - 开发计划

> 状态：**待实现**
> 创建日期：2026-03-31
> 优先级：**高**（安全相关）

---

## 一、问题背景

### 1.1 当前状况

项目目前 **没有任何请求频率限制机制**。所有 API 接口都可以被无限次调用，存在以下安全隐患：

| 接口 | 风险等级 | 问题描述 |
|------|----------|----------|
| `POST /api/auth/login` | 🔴 高 | 可被暴力破解密码 |
| `POST /api/auth/register` | 🔴 高 | 可被恶意批量注册，占满存储空间 |
| `POST /api/push/:token` | 🔴 高 | 通过 token 直接推送，无认证无限流，可被滥用发送垃圾消息 |
| `GET /api/push/:token` | 🔴 高 | 同上 |
| `POST /api/inbound/:token` | 🟡 中 | Webhook 入站，同样无认证无限流 |
| `GET /api/inbound/:token` | 🟡 中 | 同上 |
| `POST /api/auth/refresh` | 🟡 中 | Token 刷新可被滥用 |
| `GET /api/health` | 🟢 低 | 含数据库查询，可被刷 |

### 1.2 大量请求的具体影响

1. **推送接口被滥用** — 攻击者获取合法 token 后，可无限发送推送消息，导致：
   - 下游渠道（Telegram Bot、邮件等）被限流或封号
   - 用户收到垃圾消息轰炸
   - 服务声誉受损

2. **认证接口被攻击** — 登录接口无限制，可被：
   - 暴力破解密码
   - 账号枚举攻击
   - 批量恶意注册

3. **数据库压力** — 每个推送请求都会写数据库（`PushLogModel.create`）：
   - SQLite WAL 模式有一定并发能力，但高并发写入仍会产生锁竞争
   - 响应变慢甚至超时
   - 数据库文件快速增长

4. **资源耗尽** — Express 默认不限制并发连接数：
   - Node.js 事件循环被占满
   - 内存耗尽导致进程崩溃
   - 服务不可用

5. **下游服务被封** — 高频调用第三方服务（Telegram API、SMTP 等）：
   - 触发对方风控
   - 账号被封禁
   - IP 被拉黑

6. **日志膨胀** — 每个请求都写日志（`winston`）：
   - 日志文件暴涨
   - 磁盘空间耗尽

---

## 二、解决方案

### 2.1 技术选型

使用 [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit) 库实现请求频率限制。

**选择理由**：
- Express 官方推荐，Star 数 2.5k+
- 轻量级，无外部依赖
- 支持自定义 Key 生成（按 IP、按用户、按 token 等）
- 支持自定义响应
- 支持滑动窗口算法
- 与项目现有 Express 架构无缝集成

**安装命令**：
```bash
cd server && npm install express-rate-limit
```

### 2.2 限流策略设计

采用 **多层防护策略**：全局 → 接口级别 → 业务级别

#### 第一层：全局限流

所有 API 请求统一限制，防止整体滥用。

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 窗口时间 | 1 分钟 | - |
| 最大请求数 | 200 次/分钟 | 单个 IP |
| 跳过条件 | 无 | 所有请求都受限 |

#### 第二层：接口级别限流

针对特定接口设置更严格的限制。

| 接口 | 限制 | Key | 说明 |
|------|------|-----|------|
| `/api/auth/login` | 5 次/分钟 | IP | 防暴力破解 |
| `/api/auth/register` | 3 次/分钟 | IP | 防批量注册 |
| `/api/auth/refresh` | 10 次/分钟 | IP | 防滥用刷新 |
| `/api/health` | 10 次/分钟 | IP | 无需高频调用 |
| `/api/push/:token` | 30 次/分钟 | IP | 推送接口 IP 限流 |
| `/api/push/:token` | 60 次/分钟 | Token | 推送接口 Token 限流 |
| `/api/inbound/:token` | 60 次/分钟 | Token | 入站接口 Token 限流 |

#### 第三层：业务级别限流（可选）

在 `PushService` 层增加基于 endpoint 的频率控制：
- 每个 endpoint 每分钟最多 N 条消息
- 超过则返回 429 或排队处理

---

## 三、实施计划

### 3.1 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/package.json` | 修改 | 添加 `express-rate-limit` 依赖 |
| `server/src/middleware/rateLimit.middleware.js` | **新建** | 限流中间件 |
| `server/src/app.js` | 修改 | 引入全局限流 |
| `server/src/routes/auth.routes.js` | 修改 | 添加认证接口限流 |
| `server/src/routes/push.routes.js` | 修改 | 添加推送接口限流 |
| `server/src/routes/inbound.routes.js` | 修改 | 添加入站接口限流 |
| `server/src/routes/index.js` | 修改 | 添加健康检查限流 |
| `server/src/utils/response.js` | 修改 | 添加 429 响应方法 |

### 3.2 实施步骤

```
Step 1: 安装依赖
    └── npm install express-rate-limit

Step 2: 创建限流中间件
    └── server/src/middleware/rateLimit.middleware.js

Step 3: 添加 429 响应工具方法
    └── server/src/utils/response.js

Step 4: 应用全局限流
    └── server/src/app.js

Step 5: 应用接口级别限流
    ├── auth.routes.js（登录、注册、刷新）
    ├── push.routes.js（推送接口）
    ├── inbound.routes.js（入站接口）
    └── index.js（健康检查）

Step 6: 测试验证
    └── 手动测试 / 自动化测试
```

---

## 四、详细实现

### 4.1 创建限流中间件

**文件**：`server/src/middleware/rateLimit.middleware.js`

```javascript
const rateLimit = require('express-rate-limit');
const ResponseUtil = require('../utils/response');

// 获取真实 IP 的辅助函数
const getRealIP = (req) => {
  const xRealIP = req.get('X-Real-IP');
  if (xRealIP) return xRealIP;
  const xForwardedFor = req.get('X-Forwarded-For');
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  return req.ip;
};

/**
 * 自定义限流响应
 */
const rateLimitHandler = (req, res) => {
  return ResponseUtil.tooManyRequests(res, '请求过于频繁，请稍后再试');
};

/**
 * 全局限流器
 * - 每个IP每分钟最多 200 次请求
 */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 200, // 每个 IP 最多 200 次请求
  keyGenerator: getRealIP,
  handler: rateLimitHandler,
  standardHeaders: true, // 返回 `RateLimit-*` 头
  legacyHeaders: false,
});

/**
 * 登录限流器
 * - 每个IP每分钟最多 5 次登录尝试
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: getRealIP,
  handler: rateLimitHandler,
  message: '登录尝试过于频繁，请 1 分钟后再试',
});

/**
 * 注册限流器
 * - 每个IP每分钟最多 3 次注册请求
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: getRealIP,
  handler: rateLimitHandler,
  message: '注册请求过于频繁，请 1 分钟后再试',
});

/**
 * Token 刷新限流器
 * - 每个IP每分钟最多 10 次刷新
 */
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: getRealIP,
  handler: rateLimitHandler,
});

/**
 * 健康检查限流器
 * - 每个IP每分钟最多 10 次
 */
const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: getRealIP,
  handler: rateLimitHandler,
});

/**
 * 推送接口限流器（按 IP）
 * - 每个IP每分钟最多 30 次推送
 */
const pushByIPLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: getRealIP,
  handler: rateLimitHandler,
  message: '推送请求过于频繁，请稍后再试',
});

/**
 * 推送接口限流器（按 Token）
 * - 每个Token每分钟最多 60 次推送
 */
const pushByTokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    // 从 URL 参数或 Authorization 头获取 token
    return req.params.token || req.headers.authorization?.replace('Bearer ', '') || getRealIP(req);
  },
  handler: rateLimitHandler,
  message: '该接口令牌请求过于频繁，请稍后再试',
});

/**
 * 入站接口限流器（按 Token）
 * - 每个Token每分钟最多 60 次
 */
const inboundLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.params.token || getRealIP(req),
  handler: rateLimitHandler,
  message: '入站请求过于频繁，请稍后再试',
});

module.exports = {
  globalLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  healthLimiter,
  pushByIPLimiter,
  pushByTokenLimiter,
  inboundLimiter,
};
```

### 4.2 添加 429 响应方法

**文件**：`server/src/utils/response.js`（追加方法）

```javascript
/**
 * 请求过于频繁响应 (429)
 */
static tooManyRequests(res, message = '请求过于频繁') {
  return this.error(res, message, 429, 429);
}
```

### 4.3 应用全局限流

**文件**：`server/src/app.js`（在路由之前添加）

```javascript
const { globalLimiter } = require('./middleware/rateLimit.middleware');

// ... 其他中间件

// 全局限流（在路由之前）
app.use(globalLimiter);

// API路由
app.use('/api', routes);
```

### 4.4 应用接口级别限流

#### auth.routes.js

```javascript
const { loginLimiter, registerLimiter, refreshLimiter } = require('../middleware/rateLimit.middleware');

// 检查注册状态（公开接口）
router.get('/registration-status', authController.checkRegistrationStatus);

// 用户注册（限流）
router.post('/register', registerLimiter, registerValidation, authController.register);

// 用户登录（限流）
router.post('/login', loginLimiter, loginValidation, authController.login);

// 刷新令牌（限流）
router.post('/refresh', refreshLimiter, refreshTokenValidation, authController.refreshToken);
```

#### push.routes.js

```javascript
const { pushByIPLimiter, pushByTokenLimiter } = require('../middleware/rateLimit.middleware');

// 通过接口令牌推送（双重限流：IP + Token）
router.get('/:token', pushByIPLimiter, pushByTokenLimiter, pushController.pushByToken);
router.post('/:token', pushByIPLimiter, pushByTokenLimiter, pushMessageValidation, pushController.pushByToken);
router.post('/', pushByIPLimiter, pushByTokenLimiter, pushMessageValidation, pushController.pushByToken);
```

#### inbound.routes.js

```javascript
const { inboundLimiter } = require('../middleware/rateLimit.middleware');

// 入站接收接口（限流）
router.get('/:token', inboundLimiter, loadEndpoint, inboundController.handleInbound);
router.post('/:token', inboundLimiter, loadEndpoint, inboundController.handleInbound);
```

#### index.js（健康检查）

```javascript
const { healthLimiter } = require('../middleware/rateLimit.middleware');

// 健康检查接口（限流）
router.get('/health', healthLimiter, (req, res) => {
  // ... 原有逻辑
});
```

---

## 五、动态配置方案

### 5.1 配置存储

利用现有的 `SettingsModel`（`system_settings` 表），存储限流配置。每个配置项有 **默认值**，管理员可通过前端修改。

### 5.2 配置项清单

| 配置 Key | 默认值 | 说明 | 最小值 | 最大值 |
|----------|--------|------|--------|--------|
| `rate_limit_global_max` | 200 | 全局每分钟最大请求数 | 10 | 1000 |
| `rate_limit_login_max` | 5 | 登录每分钟最大请求数 | 1 | 20 |
| `rate_limit_register_max` | 3 | 注册每分钟最大请求数 | 1 | 10 |
| `rate_limit_refresh_max` | 10 | Token 刷新每分钟最大请求数 | 1 | 30 |
| `rate_limit_health_max` | 10 | 健康检查每分钟最大请求数 | 1 | 60 |
| `rate_limit_push_ip_max` | 30 | 推送接口每 IP 每分钟最大请求数 | 1 | 100 |
| `rate_limit_push_token_max` | 60 | 推送接口每 Token 每分钟最大请求数 | 1 | 200 |
| `rate_limit_inbound_max` | 60 | 入站接口每 Token 每分钟最大请求数 | 1 | 200 |

### 5.3 后端实现

#### 5.3.1 限流配置服务

**文件**：`server/src/services/rateLimitConfig.service.js`（新建）

```javascript
const SettingsModel = require('../models/settings.model');

// 默认配置
const DEFAULTS = {
  rate_limit_global_max: 200,
  rate_limit_login_max: 5,
  rate_limit_register_max: 3,
  rate_limit_refresh_max: 10,
  rate_limit_health_max: 10,
  rate_limit_push_ip_max: 30,
  rate_limit_push_token_max: 60,
  rate_limit_inbound_max: 60,
};

// 配置边界
const BOUNDS = {
  rate_limit_global_max: { min: 10, max: 1000 },
  rate_limit_login_max: { min: 1, max: 20 },
  rate_limit_register_max: { min: 1, max: 10 },
  rate_limit_refresh_max: { min: 1, max: 30 },
  rate_limit_health_max: { min: 1, max: 60 },
  rate_limit_push_ip_max: { min: 1, max: 100 },
  rate_limit_push_token_max: { min: 1, max: 200 },
  rate_limit_inbound_max: { min: 1, max: 200 },
};

class RateLimitConfigService {
  /**
   * 获取单个配置值（带回退到默认值）
   */
  static get(key) {
    const value = SettingsModel.get(key);
    if (value !== null) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        // 确保在边界范围内
        const bounds = BOUNDS[key];
        if (bounds) {
          return Math.max(bounds.min, Math.min(bounds.max, num));
        }
        return num;
      }
    }
    return DEFAULTS[key];
  }

  /**
   * 获取所有配置
   */
  static getAll() {
    const config = {};
    for (const key of Object.keys(DEFAULTS)) {
      config[key] = this.get(key);
    }
    return config;
  }

  /**
   * 获取默认值
   */
  static getDefaults() {
    return { ...DEFAULTS };
  }

  /**
   * 获取配置边界
   */
  static getBounds() {
    return { ...BOUNDS };
  }

  /**
   * 设置配置值（带边界校验）
   */
  static set(key, value) {
    const bounds = BOUNDS[key];
    if (!bounds) {
      throw new Error(`未知的配置项: ${key}`);
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error('配置值必须是数字');
    }
    const clampedValue = Math.max(bounds.min, Math.min(bounds.max, num));
    SettingsModel.set(key, clampedValue);
    return clampedValue;
  }

  /**
   * 批量设置配置
   */
  static setMany(config) {
    const results = {};
    for (const [key, value] of Object.entries(config)) {
      if (DEFAULTS[key] !== undefined) {
        results[key] = this.set(key, value);
      }
    }
    return results;
  }

  /**
   * 重置为默认值
   */
  static reset() {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      SettingsModel.set(key, value);
    }
    return this.getAll();
  }
}

module.exports = RateLimitConfigService;
```

#### 5.3.2 动态限流中间件

**文件**：`server/src/middleware/rateLimit.middleware.js`

```javascript
const rateLimit = require('express-rate-limit');
const ResponseUtil = require('../utils/response');
const RateLimitConfigService = require('../services/rateLimitConfig.service');

// 获取真实 IP
const getRealIP = (req) => {
  const xRealIP = req.get('X-Real-IP');
  if (xRealIP) return xRealIP;
  const xForwardedFor = req.get('X-Forwarded-For');
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  return req.ip;
};

// 限流响应处理器
const rateLimitHandler = (message) => (req, res) => {
  return ResponseUtil.tooManyRequests(res, message || '请求过于频繁，请稍后再试');
};

/**
 * 创建动态限流器工厂函数
 * 每次请求时从数据库读取最新配置
 */
const createDynamicLimiter = (configKey, keyGenerator, message) => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 分钟窗口
    max: () => RateLimitConfigService.get(configKey), // 动态获取限制值
    keyGenerator,
    handler: rateLimitHandler(message),
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// 导出各类限流器
const globalLimiter = createDynamicLimiter(
  'rate_limit_global_max',
  getRealIP,
  '全局请求过于频繁，请稍后再试'
);

const loginLimiter = createDynamicLimiter(
  'rate_limit_login_max',
  getRealIP,
  '登录尝试过于频繁，请 1 分钟后再试'
);

const registerLimiter = createDynamicLimiter(
  'rate_limit_register_max',
  getRealIP,
  '注册请求过于频繁，请 1 分钟后再试'
);

const refreshLimiter = createDynamicLimiter(
  'rate_limit_refresh_max',
  getRealIP,
  '令牌刷新过于频繁，请稍后再试'
);

const healthLimiter = createDynamicLimiter(
  'rate_limit_health_max',
  getRealIP,
  '健康检查请求过于频繁'
);

const pushByIPLimiter = createDynamicLimiter(
  'rate_limit_push_ip_max',
  getRealIP,
  '推送请求过于频繁，请稍后再试'
);

const pushByTokenLimiter = createDynamicLimiter(
  'rate_limit_push_token_max',
  (req) => req.params.token || req.headers.authorization?.replace('Bearer ', '') || getRealIP(req),
  '该接口令牌请求过于频繁，请稍后再试'
);

const inboundLimiter = createDynamicLimiter(
  'rate_limit_inbound_max',
  (req) => req.params.token || getRealIP(req),
  '入站请求过于频繁，请稍后再试'
);

module.exports = {
  globalLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  healthLimiter,
  pushByIPLimiter,
  pushByTokenLimiter,
  inboundLimiter,
};
```

#### 5.3.3 管理员 API

**文件**：`server/src/controllers/admin.controller.js`（追加方法）

```javascript
const RateLimitConfigService = require('../services/rateLimitConfig.service');
const ResponseUtil = require('../utils/response');

// ... 现有方法 ...

/**
 * 获取限流配置
 */
static getRateLimitConfig(req, res) {
  try {
    const config = RateLimitConfigService.getAll();
    const defaults = RateLimitConfigService.getDefaults();
    const bounds = RateLimitConfigService.getBounds();
    return ResponseUtil.success(res, { config, defaults, bounds });
  } catch (error) {
    return ResponseUtil.serverError(res, '获取限流配置失败');
  }
}

/**
 * 更新限流配置
 */
static updateRateLimitConfig(req, res) {
  try {
    const results = RateLimitConfigService.setMany(req.body);
    return ResponseUtil.success(res, results, '限流配置更新成功');
  } catch (error) {
    return ResponseUtil.badRequest(res, error.message);
  }
}

/**
 * 重置限流配置
 */
static resetRateLimitConfig(req, res) {
  try {
    const config = RateLimitConfigService.reset();
    return ResponseUtil.success(res, config, '限流配置已重置为默认值');
  } catch (error) {
    return ResponseUtil.serverError(res, '重置限流配置失败');
  }
}
```

**文件**：`server/src/routes/admin.routes.js`（追加路由）

```javascript
// 限流配置管理
router.get('/rate-limit', AdminController.getRateLimitConfig);
router.put('/rate-limit', AdminController.updateRateLimitConfig);
router.post('/rate-limit/reset', AdminController.resetRateLimitConfig);
```

### 5.4 前端实现

#### 5.4.1 API 接口

**文件**：`web/src/api/admin.js`（追加）

```javascript
import request from '@/utils/request'

// 获取限流配置
export function getRateLimitConfig() {
  return request.get('/admin/rate-limit')
}

// 更新限流配置
export function updateRateLimitConfig(data) {
  return request.put('/admin/rate-limit', data)
}

// 重置限流配置
export function resetRateLimitConfig() {
  return request.post('/admin/rate-limit/reset')
}
```

#### 5.4.2 安全设置页面

**文件**：`web/src/views/settings/Security.vue`（新建）

```vue
<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">安全设置</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          配置 API 请求频率限制，防止滥用
        </p>
      </div>
      <el-button type="warning" plain @click="handleReset">
        <RefreshCw class="w-4 h-4 mr-1" />
        重置为默认值
      </el-button>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">限流配置</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        每个配置项表示对应接口每分钟允许的最大请求次数
      </p>

      <el-form label-position="top" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <el-form-item v-for="item in configItems" :key="item.key">
            <template #label>
              <div class="flex items-center gap-2">
                <component :is="item.icon" class="w-4 h-4" />
                <span>{{ item.label }}</span>
              </div>
            </template>
            <el-input-number
              v-model="config[item.key]"
              :min="bounds[item.key]?.min || 1"
              :max="bounds[item.key]?.max || 1000"
              class="w-full"
            />
            <p class="text-xs text-gray-400 mt-1">
              范围: {{ bounds[item.key]?.min }} - {{ bounds[item.key]?.max }}，
              默认: {{ defaults[item.key] }}
            </p>
          </el-form-item>
        </div>
      </el-form>

      <div class="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <el-button type="primary" :loading="saving" @click="handleSave">
          <Save class="w-4 h-4 mr-1" />
          保存配置
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRateLimitConfig, updateRateLimitConfig, resetRateLimitConfig } from '@/api/admin'
import { RefreshCw, Save, Globe, Lock, UserPlus, Key, Activity, Send, ArrowDownRight } from 'lucide-vue-next'

const config = ref({})
const defaults = ref({})
const bounds = ref({})
const saving = ref(false)

const configItems = [
  { key: 'rate_limit_global_max', label: '全局限流', icon: Globe },
  { key: 'rate_limit_login_max', label: '登录接口', icon: Lock },
  { key: 'rate_limit_register_max', label: '注册接口', icon: UserPlus },
  { key: 'rate_limit_refresh_max', label: 'Token 刷新', icon: Key },
  { key: 'rate_limit_health_max', label: '健康检查', icon: Activity },
  { key: 'rate_limit_push_ip_max', label: '推送接口 (IP)', icon: Send },
  { key: 'rate_limit_push_token_max', label: '推送接口 (Token)', icon: Send },
  { key: 'rate_limit_inbound_max', label: '入站接口', icon: ArrowDownRight },
]

const loadConfig = async () => {
  try {
    const res = await getRateLimitConfig()
    if (res.success) {
      config.value = res.data.config
      defaults.value = res.data.defaults
      bounds.value = res.data.bounds
    }
  } catch (error) {
    ElMessage.error('加载配置失败')
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = await updateRateLimitConfig(config.value)
    if (res.success) {
      ElMessage.success('配置保存成功')
    }
  } catch (error) {
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

const handleReset = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要将所有限流配置重置为默认值吗？',
      '确认重置',
      { type: 'warning' }
    )
    const res = await resetRateLimitConfig()
    if (res.success) {
      config.value = res.data
      ElMessage.success('已重置为默认值')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重置失败')
    }
  }
}

onMounted(() => {
  loadConfig()
})
</script>
```

#### 5.4.3 路由配置

**文件**：`web/src/router/index.js`（追加路由）

```javascript
{
  path: 'settings/security',
  name: 'SecuritySettings',
  component: () => import('@/views/settings/Security.vue'),
  meta: { admin: true },
},
```

#### 5.4.4 设置页面入口

**文件**：`web/src/views/settings/Index.vue`（追加卡片）

```vue
<!-- 安全设置入口（仅管理员可见） -->
<div v-if="isAdmin" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">安全设置</h3>
  <div class="space-y-3">
    <p class="text-sm text-gray-500 dark:text-gray-400">配置 API 请求频率限制</p>
    <el-button type="primary" plain class="w-full !ml-0" @click="$router.push('/settings/security')">
      <Shield class="w-4 h-4 mr-1" />
      进入安全设置
    </el-button>
  </div>
</div>
```

---

## 六、高级配置（可选）

### 6.1 基于 Redis 的分布式限流

如果部署多实例，需要使用 Redis 存储限流计数：

```javascript
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL,
});

const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
  }),
  // ... 其他配置
});
```

### 6.2 动态限流配置

可通过环境变量或数据库配置限流参数：

```javascript
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  // ...
});
```

**环境变量**：

```bash
# .env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_GLOBAL_MAX=200
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_REGISTER_MAX=3
RATE_LIMIT_PUSH_IP_MAX=30
RATE_LIMIT_PUSH_TOKEN_MAX=60
```

### 6.3 白名单机制

跳过信任的 IP 或用户：

```javascript
const limiter = rateLimit({
  skip: (req) => {
    // 跳过本地开发
    if (process.env.NODE_ENV !== 'production') return true;
    // 跳过管理员的 IP
    const trustedIPs = (process.env.TRUSTED_IPS || '').split(',');
    const clientIP = getRealIP(req);
    return trustedIPs.includes(clientIP);
  },
});
```

### 6.4 渐进式限流

对于连续失败的登录尝试，逐步增加限制时间：

```javascript
// 可使用 express-rate-limit 的 skipFailedRequests 选项
// 或结合 express-brute 等库实现
```

---

## 七、Nginx 层限流（生产环境推荐）

在反向代理层增加限流，作为第一道防线：

```nginx
# nginx.conf
http {
  # 定义限流区域
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
  limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=1r/s;
  
  server {
    # API 限流
    location /api/ {
      limit_req zone=api_limit burst=20 nodelay;
      limit_req_status 429;
      
      proxy_pass http://localhost:3000;
    }
    
    # 认证接口更严格
    location /api/auth/ {
      limit_req zone=auth_limit burst=5 nodelay;
      limit_req_status 429;
      
      proxy_pass http://localhost:3000;
    }
  }
}
```

---

## 八、测试验证

### 8.1 手动测试

```bash
# 测试登录限流（连续请求 6 次，第 6 次应返回 429）
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nHTTP Status: %{http_code}\n\n"
done
```

### 8.2 响应头验证

限流生效后，响应会包含以下 Header：

```
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1712345678
```

### 8.3 预期结果

| 测试场景 | 预期结果 |
|----------|----------|
| 登录接口连续请求 6 次 | 第 6 次返回 429 |
| 注册接口连续请求 4 次 | 第 4 次返回 429 |
| 推送接口同一 IP 连续请求 31 次 | 第 31 次返回 429 |
| 推送接口同一 Token 连续请求 61 次 | 第 61 次返回 429 |

---

## 九、监控与告警

### 9.1 日志记录

限流触发时记录日志：

```javascript
const limiter = rateLimit({
  handler: (req, res) => {
    logger.warn('请求被限流', {
      ip: getRealIP(req),
      path: req.path,
      method: req.method,
    });
    return ResponseUtil.tooManyRequests(res, '请求过于频繁');
  },
});
```

### 9.2 监控指标

建议监控以下指标：

- 429 响应数量
- 限流触发次数（按接口分类）
- 每个 IP 的请求频率分布
- 高频请求的 IP 列表

---

## 十、总结

| 方面 | 改进前 | 改进后 |
|------|--------|--------|
| 登录安全 | 无限制，可暴力破解 | 5 次/分钟/IP |
| 注册安全 | 无限制，可批量注册 | 3 次/分钟/IP |
| 推送接口 | 无限制，可被滥用 | 30 次/分钟/IP + 60 次/分钟/Token |
| 入站接口 | 无限制 | 60 次/分钟/Token |
| 全局保护 | 无 | 200 次/分钟/IP |
| 响应规范 | 无 429 处理 | 标准化 429 响应 |

**实施后效果**：
- 有效防止暴力破解和恶意注册
- 防止推送接口被滥用
- 保护数据库和服务器资源
- 保护下游第三方服务不被触发风控
- 提升服务整体稳定性
