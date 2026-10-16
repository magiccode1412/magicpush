# 架构设计

本文档详细说明 MagicPush 的架构设计，包括分层架构、渠道适配器模式和推送核心流程。

---

## 目录

- [1. 分层架构](#1-分层架构)
- [2. 渠道适配器模式（策略模式）](#2-渠道适配器模式策略模式)
- [3. 推送核心流程](#3-推送核心流程)
- [4. 中间件体系](#4-中间件体系)
- [5. 服务层职责划分](#5-服务层职责划分)

---

## 1. 分层架构

### 1.1 整体结构

```
请求 → 路由层 (routes/) → 中间件层 (middleware/) → 控制器层 (controllers/) → 服务层 (services/) → 模型层 (models/)
                                                                                              ↓
                                                                                         SQLite 数据库
```

### 1.2 各层职责

| 层 | 目录 | 职责 | 核心原则 |
|----|------|------|----------|
| **路由层** | `routes/` | URL 到控制器的映射，参数提取 | 不包含业务逻辑 |
| **中间件层** | `middleware/` | 认证、限流、校验、错误处理 | 洋葱模型，按序执行 |
| **控制器层** | `controllers/` | 接收请求、调用 Service、返回响应 | 每个方法都用 try/catch |
| **服务层** | `services/` | 核心业务逻辑编排 | 通过 throw Error 报告异常 |
| **模型层** | `models/` | SQL 封装（CRUD）、数据持久化 | 同步调用（better-sqlite3） |

### 1.3 数据流转示例

以「通过 Token 推送消息」为例：

```
POST /api/push/{token}
    │
    ▼
[路由层] push.routes.js        提取 token 参数
    │
    ▼
[中间件] 无需认证              （Token 本身就是凭证）
    │
    ▼
[控制器] push.controller.js     try { result = await PushService.pushByToken(...) }
    │                            catch (e) { return ResponseUtil.serverError(...) }
    ▼
[服务层] push.service.js        1. Token 校验 → 2. 关键词过滤 → 3. DND 检查
                                4. 获取关联渠道 → 5. 遍历发送 → 6. 记录日志
    │
    ▼
[模型层] endpoint.model.js      findByToken() / updateLastUsed()
         pushLog.model.js       create() / updateStatus()
    │
    ▼
[数据库] SQLite                 INSERT / UPDATE / SELECT
```

---

## 2. 渠道适配器模式（策略模式）

这是本项目最核心的设计模式。每个通知渠道是一个独立的适配器类，统一继承自 `BaseChannel` 基类，实现**开闭原则**——对扩展开放、对修改关闭。

### 2.1 类层次结构

```
BaseChannel (抽象基类) — base.channel.js
  │
  ├── send(message)              -- 发送消息（必须实现）
  ├── validate(config)           -- 验证配置（必须实现）
  ├── test()                     -- 测试连接（必须实现）
  ├── getName()                  -- 渠道名称（静态方法，必须实现）
  ├── getDescription()           -- 渠道描述（静态方法，可选覆盖）
  ├── getConfigFields()          -- 动态表单字段定义（静态方法，必须实现）
  └── createProxyAgent(proxyUrl) -- 创建代理 Agent（已内置实现）
        │
        ├── WechatclawbotChannel   (微信龙虾机器人)
        ├── YuanbaobotChannel     (元宝 Bot)
        ├── WecomChannel          (企业微信群机器人)
        ├── TelegramChannel       (Telegram Bot)
        ├── PushPlusChannel       (PushPlus 推加)
        ├── WxPusherChannel       (WxPusher 微信推送)
        ├── FeishuChannel         (飞书)
        ├── DingtalkChannel       (钉钉)
        ├── WebhookChannel        (通用 Webhook)
        ├── WechatOfficialChannel (微信公众号模板消息)
        ├── ServerChanChannel     (Server酱)
        ├── SmtpChannel           (SMTP 邮件)
        ├── GotifyChannel         (Gotify 自托管推送)
        ├── MeowChannel           (喵喵推送)
        ├── WecomappChannel       (企业微信应用消息)
        ├── BarkChannel           (Bark iOS 推送)
        ├── PushMeChannel         (PushMe 推推)
        ├── XizhiChannel          (息知)
        ├── MqttChannel           (MQTT 协议发布消息)
        └── QqbotChannel          (QQ 机器人 — 开发中未启用)
```

### 2.2 BaseChannel 接口定义

```javascript
class BaseChannel {
  constructor(config)

  // ========== 必须实现的抽象方法 ==========

  // 发送消息
  // @param {Object} message - { title, content, type(text/markdown/html), url }
  // @returns {Promise<Object>} 发送结果（会被记录到 push_logs.response）
  async send(message)

  // 验证渠道配置是否合法
  // @param {Object} config - 用户填写的配置值
  // @returns {Object} { valid: boolean, message: string }
  validate(config)

  // 测试渠道连通性
  // @returns {Promise<Object>} { success: boolean, message: string }
  async test()

  // ========== 必须实现的静态方法 ==========

  // 渠道的唯一类型标识（用于数据库存储和工厂查找）
  // @returns {string} 如 'telegram', 'feishu' 等（小写英文）
  static getName()

  // 获取配置字段的动态表单定义（前端根据此渲染配置表单）
  // @returns {Array<Object>} 字段定义数组
  static getConfigFields()

  // ========== 可选覆写的方法 ==========

  // 渠道描述文案（显示在前端渠道选择列表）
  static getDescription()

  // 已内置：代理支持（HTTP/SOCKS5）
  createProxyAgent(proxyUrl)
```

### 2.3 设计优势

| 特点 | 说明 |
|------|------|
| **前端零改动** | 配置字段通过 `getConfigFields()` 声明，前端自动动态渲染表单 |
| **数据库零改动** | 渠道配置以 JSON 格式存储在 `channels` 表的 `config` 字段中 |
| **统一接口** | 所有渠道实现相同的 `send` / `validate` / `test` 方法 |
| **即插即用** | 只需创建文件并注册，无需修改其他模块 |
| **易测试** | 每个渠道可独立进行单元测试 |

---

## 3. 推送核心流程

### 3.1 完整流程图

```
外部推送请求
     │
     ▼
┌─────────────────────┐
│ Token 校验 / 认证校验  │  ← pushByToken / pushByEndpoint / pushByChannel 三种入口
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 关键词过滤检查        │  ← KeywordFilterService（黑名单/白名单模式）
│  命中则拒绝并返回错误  │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 更新接口最后使用时间    │  ← EndpointModel.updateLastUsed()
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 获取关联的所有渠道     │  ← EndpointModel.getChannels()
└──────────┬──────────┘
           ▼
    ┌──────┴──────┐
    │ 遍历每个渠道  │
    └──────┬──────┘
           ▼
┌─────────────────────┐
│ 免打扰(DND)检查       │  ← DoNotDisturbService.shouldMute()
│  全局开关 + 每接口     │     最多5个时间段配置
│  独立的时间段配置       │     匹配时记录 skipped_dnd 日志，跳过推送
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 创建 push_log        │  ← status = 'pending'
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 获取渠道适配器        │  ← getChannelAdapter(type, config, channelId)
│ 调用 adapter.send()  │
└──────────┬──────────┘
           ▼
    ┌──────┴──────┐
    │ 成功?         │
    └──┬────────┬─┘
       ▼        ▼
   status=   status=
   success   failed
       │        │
       └───┬────┘
           ▼
   汇总结果返回调用方
   { success, total, successCount, failedCount, results[] }
```

### 3.2 三种推送入口

| 入口方式 | 路径 | 认证方式 | 场景 |
|----------|------|----------|------|
| **Token 推送** | `POST /api/push/:token` | Token 鉴权 | 外部系统/脚本调用 |
| **接口ID推送** | `POST /api/push/by-endpoint/:id` | JWT 认证 | 前端手动触发 |
| **渠道ID推送** | `POST /api/push/by-channel/:id` | JWT 认证 | 指定渠道调试 |

---

## 4. 中间件体系

采用 Express 洋葱模型的中间件链：

### 4.1 全局中间件（app.js 级别）

| 中间件 | 功能 |
|--------|------|
| CORS | 跨域访问控制 |
| `express.json()` | JSON 请求体解析（limit: 10mb） |
| `errorMiddleware` | 全局错误捕获（404/500 兜底） |

### 4.2 路由级中间件

| 中间件 | 文件 | 功能 |
|--------|------|------|
| **auth middleware** | `auth.middleware.js` | JWT access token 校验，解析用户身份 |
| **rate limit middleware** | `rateLimit.middleware.js` | 三层限流：全局/IP级/健康检查 |
| **validator middleware** | `validator.middleware.js` | 基于 express-validator 的请求参数校验规则 |

### 4.3 执行顺序图

```
请求进入
  │
  ├─→ CORS 中间件
  ├─→ express.json() 解析
  │
  ├─→ 路由匹配
  │     │
  │     ├─→ auth middleware（如需要认证）
  │     ├─→ rate limit middleware
  │     ├─→ validator middleware（如有校验规则）
  │     │
  │     └─→ Controller 处理
  │
  └─→ errorMiddleware（未捕获的异常兜底）
```

### 4.4 限流层级

| 层级 | 默认限制 | 说明 |
|------|----------|------|
| **全局限流** | 100 req/min | 所有请求的全局上限 |
| **IP 级限流** | 60 req/min | 按 IP 地址限制 |
| **健康检查** | 30 req/min | `/api/health` 独立限流 |

管理员可通过 API 动态调整限额，无需重启服务。

---

## 5. 服务层职责划分

| 服务文件 | 职责 | 协作对象 |
|----------|------|----------|
| **push.service.js** | 核心：推送调度引擎，编排 DND→创建日志→遍历渠道→发送→更新状态 | ChannelService, EndpointModel, DoNotDisturbService |
| **channel.service.js** | 渠道的增删改查逻辑，配置的序列化/反序列化 | ChannelModel |
| **endpoint.service.js** | 接口管理，渠道绑定/解绑、Token 管理 | EndpointModel, ChannelModel |
| **inbound.service.js** | 入站 Webhook 接收后，根据模板提取 title/content 并转发 | JsonPathUtil, PushService |
| **keywordFilter.service.js** | 关键词过滤：黑名单（命中拦截）和白名单（命中放行） | - |
| **doNotDisturb.service.js** | 免打扰判断：最多 5 个时间段，支持跨天（如 23:00-06:00） | - |
| **rateLimitConfig.service.js** | 限流额度的动态读写（仅管理员可操作） | SystemSettingsModel |
| **auth.service.js** | 登录/注册/刷新 token 的业务逻辑 | UserModel, TokenUtil |
| **log.service.js** | 推送记录的多条件查询（分页、筛选、排序） | PushLogModel |
