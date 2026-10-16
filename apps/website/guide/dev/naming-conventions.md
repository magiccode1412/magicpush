# 命名规范

本文档定义了 MagicPush 项目中各层级的命名约定，确保团队协作时代码风格一致。

---

## 目录

- [1. 文件命名](#1-文件命名)
- [2. 类与函数命名](#2-类与函数命名)
- [3. 变量与常量命名](#3-变量与常量命名)
- [4. 数据库命名](#4-数据库命名)
- [5. 前端组件命名](#5-前端组件命名)
- [6. 路由与 API 命名](#6-路由与-api-命名)
- [7. 配置与环境变量命名](#7-配置与环境变量命名)

---

## 1. 文件命名

### 1.1 后端 (server/)

统一使用 **kebab-case**（小写字母 + 连字符）：

| 类型 | 格式 | 示例 |
|------|------|------|
| 控制器 | `{资源名}.controller.js` | `user.controller.js`, `auth.controller.js` |
| 服务 | `{功能名}.service.js` | `push.service.js`, `doNotDisturb.service.js` |
| 模型 | `{实体名}.model.js` | `endpoint.model.js`, `refreshToken.model.js` |
| 中间件 | `{功能名}.middleware.js` | `rateLimit.middleware.js`, `validator.middleware.js` |
| 路由 | `{资源名}.routes.js` | `channel.routes.js`, `admin.routes.js` |
| 渠道适配器 | `{平台名}.channel.js` | `telegram.channel.js`, `feishu.channel.js` |
| 工具函数 | `{功能名}.js` | `logger.js`, `response.js`, `token.js` |

### 1.2 前端 (web/)

| 类型 | 格式 | 示例 |
|------|------|------|
| Vue 组件 | **PascalCase**`.vue` | `Dashboard.vue`, `ClawbotBindDialog.vue` |
| API 模块 | **kebab-case**`.js` | `user.js`, `endpoint.js` |
| Store | **camelCase**`.js` | `auth.js`, `settings.js` |
| 工具函数 | **kebab-case**`.js` | `request.js`, `version.js` |

---

## 2. 类与函数命名

### 2.1 类命名

使用 **PascalCase**（大驼峰）：

```javascript
// 控制器
class UserController { }

// 服务
class PushService { }
class DoNotDisturbService { }

// 模型
class EndpointModel { }
class ChannelModel { }

// 渠道适配器
class TelegramChannel { }
class SmtpChannel { }
```

### 2.2 方法 / 函数命名

使用 **camelCase**（小驼峰）：

```javascript
class UserController {
  // 获取数据
  static async getCurrentUser(req, res) { }

  // 更新操作
  static async updateCurrentUser(req, res) { }

  // 删除操作
  static async deleteUser(id) { }

  // 判断方法 - 返回 boolean
  static isTokenExpired(token) { }

  // 获取单个对象
  static findById(id) { }

  // 获取列表
  static findAll(filters) { }
}
```

**常用前缀约定：**

| 前缀 | 用途 | 示例 |
|------|------|------|
| `get` | 获取数据 | `getUser()`, `getChannels()` |
| `create` / `add` | 新建 | `createEndpoint()` |
| `update` / `edit` | 更新 | `updateChannel()` |
| `delete` / `remove` | 删除 | `deleteLog()` |
| `is` / `has` / `should` | 布尔判断 | `isValid()`, `shouldMute()` |
| `handle` | 处理逻辑 | `handlePush()` |

---

## 3. 变量与常量命名

### 3.1 变量 — camelCase

```javascript
const userId = req.user.id;
const channelType = 'telegram';
const isActive = true;
let lastUsedAt = new Date();
```

### 3.2 常量 — UPPER_SNAKE_CASE

```javascript
// 环境配置类
const DEFAULT_PORT = 3000;
const MAX_RETRY_COUNT = 3;
const TOKEN_EXPIRY = '15m';

// 限流配置
const GLOBAL_RATE_LIMIT = 100;
const IP_RATE_LIMIT = 60;

// 内存监控阈值
const MEMORY_SAMPLE_INTERVAL = 5000;   // ms
const HEAP_MIN_THRESHOLD = 50 * 1024 * 1024; // 50MB
```

### 3.3 私有属性 / 方法

使用下划线前缀表示内部使用：

```javascript
class SmtpChannel {
  constructor(config) {
    this._transporter = null;  // 内部缓存
  }

  _createTransporter() { }     // 内部方法
}
```

---

## 4. 数据库命名

### 4.1 表名 — 复数 snake_case

```sql
users              -- 用户表
channels           -- 渠道表
endpoints          -- 接口表
push_logs          -- 推送记录表
refresh_tokens     -- 刷新令牌表
system_settings    -- 系统设置表
endpoint_channels  -- 关联表
```

### 4.2 字段名 — snake_case

```sql
-- 主键
id INTEGER PRIMARY KEY AUTOINCREMENT

-- 外键（关联表名_单数）
user_id INTEGER REFERENCES users(id)
channel_id INTEGER REFERENCES channels(id)

-- 时间戳
created_at DATETIME DEFAULT (datetime('now'))
updated_at DATETIME DEFAULT (datetime('now'))
last_used_at DATETIME

-- 布尔值（SQLite 用 INTEGER 0/1）
is_active INTEGER DEFAULT 1
dnd_global_enabled INTEGER DEFAULT 0

-- JSON 配置字段
inbound_config TEXT       -- JSON 格式存储
keyword_filter TEXT       -- JSON 格式存储
do_not_disturb TEXT       -- JSON 格式存储
```

### 4.3 JavaScript 对象 ↔ 数据库字段映射

Model 层负责将 `snake_case`(DB) 转换为 `camelCase`(JS)：

```javascript
// 数据库返回
{ id: 1, user_id: 2, channel_type: 'telegram', created_at: '2024-01-01' }

// Model 层转换后返回给 Controller
{
  id: 1,
  userId: 2,          // user_id → userId
  channelType: 'telegram',  // channel_type → channelType
  createdAt: '2024-01-01'   // created_at → createdAt
}
```

---

## 5. 前端组件命名

### 5.1 Vue 组件文件 — PascalCase.vue

```
components/
├── Layout/
│   └── MainLayout.vue        # 布局组件
├── ClawbotBindDialog.vue      # 对话框以 Dialog 结尾
├── YuanbaobotBindDialog.vue
└── VersionUpdateDialog.vue    # 弹窗组件

views/
├── Dashboard.vue              # 页面视图
├── Login.vue
├── Register.vue
├── endpoints/
│   └── List.vue               # 列表页面统一用 List.vue
├── channels/
│   └── List.vue
├── settings/
│   ├── Index.vue              # 设置首页
│   └── Security.vue           # 设置子页
└── admin/
    └── Users.vue
```

### 5.2 组件注册名 — PascalCase

```vue
<!-- 使用时 -->
<MainLayout />
<ClawbotBindDialog />
<VersionUpdateDialog />
```

### 5.3 Store 函数 — use + PascalCase

```javascript
export const useAuthStore = defineStore('auth', () => { ... })
export const useSettingsStore = defineStore('settings', () => { ... })
export const useThemeStore = defineStore('theme', () => { ... })
```

---

## 6. 路由与 API 命名

### 6.1 RESTful API 路径

使用 **复数名词 + kebab-case**：

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 列表 | GET | `/api/channels` | 获取全部 |
| 详情 | GET | `/api/channels/:id` | 获取单个 |
| 创建 | POST | `/api/channels` | 新建 |
| 更新 | PUT | `/api/channels/:id` | 全量更新 |
| 删除 | DELETE | `/api/channels/:id` | 删除 |
| 操作 | POST | `/api/channels/:id/test` | 特定动作 |

### 6.2 特殊路径

| 路径 | 用途 |
|------|------|
| `/api/push/:token` | Token 方式推送 |
| `/api/auth/login` | 登录 |
| `/api/auth/register` | 注册 |
| `/api/auth/refresh` | 刷新 Token |
| `/api/users/me` | 当前用户 |
| `/api/health` | 健康检查 |
| `/api/version` | 版本信息 |
| `/api/admin/*` | 管理员功能 |

### 6.3 前端路由路径 — kebab-case

| 路径 | 组件 |
|------|------|
| `/login` | `Login.vue` |
| `/endpoints` | `endpoints/List.vue` |
| `/settings/security` | `settings/Security.vue` |
| `/users` | `admin/Users.vue` |

---

## 7. 配置与环境变量命名

### 7.1 环境变量 — UPPER_SNAKE_CASE

```env
# 服务配置
NODE_ENV=production
PORT=3000

# JWT 认证
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 数据库
DB_PATH=./data/push_service.db

# 日志
LOG_LEVEL=info
TZ=Asia/Shanghai

# 前端地址（CORS）
FRONTEND_URL=https://example.com
```

### 7.2 配置键名 — snake_case

```json
{
  "registration_enabled": true,
  "dnd_global_enabled": false,
  "global_rate_limit": 100,
  "ip_rate_limit": 60
}
```
