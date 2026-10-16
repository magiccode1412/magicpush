# 数据库设计

本文档详细说明 MagicPush 的数据库表结构、字段定义和迁移策略。

---

## 目录

- [1. 存储引擎](#1-存储引擎)
- [2. ER 关系](#2-er-关系)
- [3. 表结构详情](#3-表结构详情)
  - [3.1 users — 用户表](#31-users--用户表)
  - [3.2 channels — 渠道配置表](#32-channels--渠道配置表)
  - [3.3 endpoints — 推送接口表](#33-endpoints--推送接口表)
  - [3.4 endpoint_channels — 接口-渠道关联表](#34-endpoint_channels--接口渠道关联表)
  - [3.5 push_logs — 推送记录表](#35-push_logs--推送记录表)
  - [3.6 refresh_tokens — 刷新令牌表](#36-refresh_tokens--刷新令牌表)
  - [3.7 system_settings — 系统设置表](#37-system_settings--系统设置表)
- [4. 数据库迁移策略](#4-数据库迁移策略)

---

## 1. 存储引擎

| 属性 | 说明 |
|------|------|
| **数据库** | SQLite3 (better-sqlite3 同步 API) |
| **文件路径** | 默认 `./data/push_service.db`（可通过 `DB_PATH` 环境变量配置） |
| **日志模式** | WAL (Write-Ahead Logging)，提升并发读写性能 |
| **外键约束** | 已启用 |
| **时区** | 默认东八区 `Asia/Shanghai`（可通过 `TZ` 环境变量覆盖） |
| **持久化** | Docker 部署时通过 Volume 挂载到宿主机 |

---

## 2. ER 关系

```
users (1) ─────< (N) channels        (一个用户拥有多个渠道)
  │
  │
  (1) ─────< (N) endpoints           (一个用户拥有多个推送接口)
  │                                  │
  │                                  │
  │                    (N) endpoint_channels (N)    多对多: 接口与渠道的关联
  │                                  │
  (1) ─────< (N) push_logs          (用户的推送记录)
                    │
                    ├──> (N..1) endpoints   (可选外键)
                    └──> (N..1) channels    (可选外键)

users (1) ─────< (N) refresh_tokens   (用户的刷新令牌，用于吊销)

system_settings                      (全局 KV 键值对设置，无用户归属)
```

---

## 3. 表结构详情

### 3.1 users — 用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| username | TEXT | NOT NULL UNIQUE | 用户名 |
| email | TEXT | NOT NULL UNIQUE | 邮箱（登录凭证） |
| password | TEXT | NOT NULL | bcrypt 哈希密码 |
| avatar | TEXT | | 头像 URL |
| role | TEXT | DEFAULT 'user' | 角色: `admin` / `user` |
| created_at | DATETIME | DEFAULT now | 创建时间 |
| updated_at | DATETIME | DEFAULT now | 更新时间 |

### 3.2 channels — 渠道配置表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| user_id | INTEGER | FK → users.id | 所属用户 |
| channel_type | TEXT | NOT NULL | 渠道类型标识（如 telegram, bark） |
| name | TEXT | NOT NULL | 渠道自定义名称 |
| config | TEXT | NOT NULL | JSON 格式的渠道配置参数 |
| is_active | INTEGER | DEFAULT 1 | 是否启用: 1=启用, 0=禁用 |
| created_at | DATETIME | DEFAULT now | 创建时间 |
| updated_at | DATETIME | DEFAULT now | 更新时间 |

### 3.3 endpoints — 推送接口表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| user_id | INTEGER | FK → users(id) ON DELETE CASCADE | 所属用户 |
| name | TEXT | NOT NULL | 接口名称 |
| token | TEXT | NOT NULL UNIQUE | 推送 Token（用于 API 调用） |
| description | TEXT | | 接口描述 |
| is_active | INTEGER | DEFAULT 1 | 是否启用 |
| inbound_config | TEXT | JSON | 入站 Webhook 配置（数据来源模板等） |
| keyword_filter | TEXT | JSON | 关键词过滤配置 |
| do_not_disturb | TEXT | JSON | 免打扰时段配置 |
| last_used_at | DATETIME | 最后使用时间 |
| created_at | DATETIME | DEFAULT now | 创建时间 |
| updated_at | DATETIME | DEFAULT now | 更新时间 |

### 3.4 endpoint_channels — 接口-渠道多对多关联表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| endpoint_id | INTEGER | FK → endpoints(id) CASCADE | 接口 ID |
| channel_id | INTEGER | FK → channels(id) CASCADE | 渠道 ID |
| UNIQUE(endpoint_id, channel_id) | | | 同一接口不能重复绑定同一渠道 |
| created_at | DATETIME | DEFAULT now | 绑定时间 |

### 3.5 push_logs — 推送记录表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| user_id | INTEGER | FK → users(id) CASCADE | 用户 ID |
| endpoint_id | INTEGER | FK → endpoints(id) SET NULL | 接口 ID |
| endpoint_name | TEXT | | 接口名称冗余存储（便于查询展示） |
| channel_id | INTEGER | FK → channels(id) SET NULL | 渠道 ID |
| channel_type | TEXT | | 渠道类型冗余存储 |
| title | TEXT | | 消息标题 |
| content | TEXT | NOT NULL | 消息内容 |
| message_type | TEXT | DEFAULT 'text' | 消息类型: text/markdown/html |
| status | TEXT | NOT NULL | 状态: `success` / `failed` / `skipped_dnd` / `pending` |
| response | TEXT | | 渠道原始返回结果 |
| error_message | TEXT | | 错误信息 |
| ip | TEXT | | 请求来源 IP |
| created_at | DATETIME | DEFAULT now | 推送时间 |

### 3.6 refresh_tokens — 刷新令牌表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| user_id | INTEGER | FK → users(id) CASCADE | 用户 ID |
| token | TEXT | NOT NULL UNIQUE | 刷新令牌值 |
| expires_at | DATETIME | NOT NULL | 过期时间 |
| created_at | DATETIME | DEFAULT now | 创建时间 |

### 3.7 system_settings — 系统设置表（KV 键值对）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| key | TEXT | NOT NULL UNIQUE | 设置键名 |
| value | TEXT | NOT NULL | 设置值 |
| created_at | DATETIME | DEFAULT now | 创建时间 |
| updated_at | DATETIME | DEFAULT now | 更新时间 |

**常用设置项：**

| key | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| `registration_enabled` | bool | true | 是否开放注册 |
| `dnd_global_enabled` | bool | false | 免打扰功能全局开关 |

---

## 4. 数据库迁移策略

采用 **try-catch ALTER TABLE** 的增量迁移方式，在 `apps/server/src/database/init.js` 中逐步添加新字段：

### 4.1 迁移方式

```javascript
// apps/server/src/database/init.js

// 新增字段时：try-catch 包裹，已存在则忽略
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
} catch (e) {
  // 字段已存在，忽略错误（正常情况）
}
```

### 4.2 迁移原则

- 字段已存在时静默忽略（catch 后不做处理）
- 新字段带默认值，不影响现有数据
- 不做破坏性变更（不删除列、不修改类型）

### 4.3 已执行的迁移历史

| 迁移内容 | 目标表 | 说明 |
|----------|--------|------|
| ip 字段 | push_logs | 记录请求来源 IP |
| endpoint_name 冗余字段 | push_logs | 避免联表查询 |
| inbound_config 字段 | endpoints | 入站 Webhook 配置 |
| keyword_filter 字段 | endpoints | 关键词过滤配置 |
| do_not_disturb 字段 | endpoints | 免打扰时段配置 |
| role 字段 | users | 用户角色区分 |
