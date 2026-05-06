# MagicPush 开发文档

## 目录

- [项目概述](#-项目概述)
- [技术栈](#-技术栈)
- [项目结构](#-项目结构)
- [架构设计](#-架构设计)
  - [分层架构](#-分层架构)
  - [渠道适配器模式（策略模式）](#-渠道适配器模式策略模式)
  - [推送核心流程](#-推送核心流程)
- [API 路由总览](#-api-路由总览)
- [数据库设计](#-数据库设计)
  - [ER 关系](#er-关系)
  - [表结构详情](#-表结构详情)
- [中间件体系](#-中间件体系)
- [服务层说明](#-服务层说明)
- [前端架构](#-前端架构)
- [快速开始](#-快速开始)
- [环境变量](#-环境变量)
- [开发指南](#-开发指南)
  - [添加新的消息渠道](#-添加新的消息渠道)
  - [添加入站配置数据来源模板](#-添加入站配置数据来源模板)
- [故障排除](#-故障排除)

---

## 📌 项目概述

| 属性 | 详情 |
|------|------|
| **项目名称** | MagicPush |
| **当前版本** | v1.9.0 |
| **项目定位** | 支持多种消息渠道的推送服务管理平台（统一消息推送网关） |
| **开源协议** | MIT License |
| **运行时要求** | Node.js >= 18.0.0, npm >= 9.0.0 |

MagicPush 解决的核心问题：**通过一个标准化的 REST API，将消息同时推送到多种第三方通知渠道**（微信 / Telegram / 飞书 / 钉钉 / 邮件等），支持关键词过滤、免打扰时段、入站 Webhook 转发等企业级功能。

---

## 🛠 技术栈

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 18+ | 运行时环境 |
| **Express.js** | 4.x | Web 框架 / REST API |
| **SQLite3 (better-sqlite3)** | ^9.4.3 | 数据库存储（同步 API，WAL 模式） |
| **JWT (jsonwebtoken)** | ^9.0.2 | 双令牌认证机制（access + refresh token） |
| **bcryptjs** | ^2.4.3 | 密码哈希加密 |
| **express-rate-limit** | ^8.3.2 | 三层限流防护（全局/IP级/接口级） |
| **axios** | ^1.15.2 | HTTP 客户端（调用各渠道 API） |
| **nodemailer** | ^8.0.3 | SMTP 邮件发送 |
| **ws** | ^8.20.0 | WebSocket（元宝 Bot 连接） |
| **winston** | ^3.12.0 | 日志管理 |
| **protobufjs** | ^8.0.3 | Protocol Buffers（元宝 Bot 协议编解码） |
| **uuid** | ^9.0.1 | UUID 生成 |
| **https-proxy-agent / socks-proxy-agent** | ^7.0.2 / ^8.0.2 | HTTP/SOCKS 代理支持 |
| **dotenv** | ^16.4.5 | 环境变量管理 |
| **cors** | ^2.8.5 | 跨域支持 |
| **express-validator** | ^7.0.1 | 请求参数验证 |

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue 3** | ^3.4.21 | 前端框架（Composition API） |
| **Vite** | ^5.2.0 | 构建工具 |
| **Element Plus** | ^2.6.3 | UI 组件库 |
| **Tailwind CSS** | ^3.4.3 | 原子化 CSS 框架 |
| **Pinia** | ^2.1.7 | 状态管理 |
| **Vue Router** | ^4.3.0 | 路由管理 |
| **Axios** | ^1.15.2 | HTTP 请求客户端 |
| **lucide-vue-next** | ^0.363.0 | 图标库 |

### 基础设施

| 技术 | 说明 |
|------|------|
| **包管理器** | pnpm |
| **容器化** | Docker（All-in-One 单镜像 / docker-compose 前后端分离） |
| **CI/CD** | .cnb.yml（CNB云原生构建） |

---

## 📁 项目结构

```
/workspace/
├── server/                              # 后端项目
│   ├── src/
│   │   ├── app.js                       # Express 应用入口
│   │   │
│   │   ├── config/                      # 配置模块
│   │   │   ├── database.js              # SQLite 数据库连接配置（WAL模式、外键约束）
│   │   │   └── version.js               # 版本信息配置
│   │   │
│   │   ├── controllers/                 # 控制器层（12个控制器）
│   │   │   ├── auth.controller.js       # 认证（登录/注册/刷新Token）
│   │   │   ├── user.controller.js       # 用户信息/统计
│   │   │   ├── channel.controller.js    # 渠道 CRUD + 测试发送
│   │   │   ├── endpoint.controller.js   # 推送接口 CRUD + 渠道绑定
│   │   │   ├── push.controller.js       # 推送 API 入口（Token/接口ID/渠道ID）
│   │   │   ├── inbound.controller.js    # 入站 Webhook 接收
│   │   │   ├── log.controller.js        # 推送记录查询
│   │   │   ├── admin.controller.js      # 管理员功能（用户管理/系统设置）
│   │   │   ├── version.controller.js    # 版本信息
│   │   │   ├── clawbot.controller.js    # 龙虾机器人绑定回调
│   │   │   └── yuanbaobot.controller.js # 元宝 Bot 回调
│   │   │
│   │   ├── middleware/                  # 中间件层
│   │   │   ├── auth.middleware.js       # JWT 认证中间件
│   │   │   ├── error.middleware.js      # 全局错误处理中间件
│   │   │   ├── rateLimit.middleware.js  # 三层限流中间件
│   │   │   └── validator.middleware.js  # 请求参数校验中间件
│   │   │
│   │   ├── models/                      # 数据模型层（6个模型）
│   │   │   ├── user.model.js            # 用户模型
│   │   │   ├── channel.model.js         # 渠道模型
│   │   │   ├── endpoint.model.js        # 推送接口模型
│   │   │   ├── pushLog.model.js         # 推送记录模型
│   │   │   ├── refreshToken.model.js    # 刷新令牌模型
│   │   │   └── settings.model.js        # 系统设置模型（KV键值对）
│   │   │
│   │   ├── routes/                      # 路由定义（11组路由）
│   │   │   ├── index.js                 # 路由聚合入口
│   │   │   ├── auth.routes.js           # 认证路由
│   │   │   ├── user.routes.js           # 用户路由
│   │   │   ├── channel.routes.js        # 渠道路由
│   │   │   ├── endpoint.routes.js       # 接口路由
│   │   │   ├── push.routes.js           # 推送路由
│   │   │   ├── inbound.routes.js        # 入站路由
│   │   │   ├── log.routes.js            # 日志路由
│   │   │   ├── admin.routes.js          # 管理员路由
│   │   │   ├── version.routes.js        # 版本路由
│   │   │   ├── clawbot.routes.js        # 龙虾机器人路由
│   │   │   └── yuanbaobot.routes.js     # 元宝Bot路由
│   │   │
│   │   ├── services/                    # 业务服务层
│   │   │   ├── channels/                # 渠道适配器目录（策略模式核心）
│   │   │   │   ├── base.channel.js      # 基类（所有渠道继承此类）
│   │   │   │   ├── index.js             # 渠道注册中心 & 工厂方法
│   │   │   │   ├── wechatclawbot.channel.js
│   │   │   │   ├── yuanbaobot.channel.js
│   │   │   │   ├── wecom.channel.js
│   │   │   │   ├── telegram.channel.js
│   │   │   │   ├── pushplus.channel.js
│   │   │   │   ├── wxpusher.channel.js
│   │   │   │   ├── feishu.channel.js
│   │   │   │   ├── dingtalk.channel.js
│   │   │   │   ├── webhook.channel.js
│   │   │   │   ├── wechat-official.channel.js
│   │   │   │   ├── serverchan.channel.js
│   │   │   │   ├── smtp.channel.js
│   │   │   │   ├── gotify.channel.js
│   │   │   │   ├── meow.channel.js
│   │   │   │   ├── wecomapp.channel.js
│   │   │   │   ├── bark.channel.js
│   │   │   │   ├── pushme.channel.js
│   │   │   │   ├── xizhi.channel.js
│   │   │   │   └── qqbot.channel.js     # 开发中，未启用
│   │   │   │
│   │   │   ├── push.service.js          # 核心推送调度引擎
│   │   │   ├── channel.service.js       # 渠道管理服务
│   │   │   ├── endpoint.service.js      # 推送接口管理服务
│   │   │   ├── inbound.service.js       # 入站 Webhook 接收并转发
│   │   │   ├── keywordFilter.service.js # 关键词过滤服务
│   │   │   ├── doNotDisturb.service.js  # 免打扰(DND)服务
│   │   │   ├── rateLimitConfig.service.js # 限流动态配置服务
│   │   │   ├── auth.service.js          # 认证服务
│   │   │   ├── log.service.js           # 日志查询服务
│   │   │   ├── clawbot/                 # 微信龙虾机器人长轮询监控服务
│   │   │   └── yuanbaobot/             # 元宝Bot WebSocket 服务
│   │   │
│   │   ├── utils/                       # 工具函数
│   │   │   ├── logger.js                # Winston 日志封装
│   │   │   ├── response.js              # 统一响应格式
│   │   │   ├── token.js                 # JWT Token 工具
│   │   │   └── jsonpath.js              # JSONPath 解析 + 预设模板
│   │   │
│   │   └── database/
│   │       └── init.js                  # 数据库初始化脚本（建表 + 迁移）
│   │
│   ├── Dockerfile                        # 后端 Dockerfile
│   ├── package.json
│   └── .env                              # 环境变量（不提交版本控制）
│
├── web/                                 # 前端项目
│   ├── src/
│   │   ├── App.vue                       # 根组件（页面切换动画）
│   │   ├── main.js                       # 应用入口
│   │   │
│   │   ├── api/                          # API 请求封装（8个模块）
│   │   │   ├── request.js               # Axios 实例（拦截器、自动Token刷新）
│   │   │   ├── auth.js                  # 认证 API
│   │   │   ├── user.js                  # 用户 API
│   │   │   ├── channel.js               # 渠道 API
│   │   │   ├── endpoint.js              # 接口 API
│   │   │   ├── push.js                  # 推送 API
│   │   │   ├── log.js                   # 日志 API
│   │   │   └── admin.js                 # 管理员 API
│   │   │
│   │   ├── components/                  # 组件
│   │   │   ├── Layout/                 # 主布局组件（侧边栏+顶栏+内容区）
│   │   │   ├── ClawbotBindDialog.vue    # 龙虾机器人绑定对话框
│   │   │   ├── YuanbaobotBindDialog.vue # 元宝Bot绑定对话框
│   │   │   └── VersionUpdateDialog.vue  # 版本更新提示弹窗
│   │   │
│   │   ├── router/                      # Vue Router 路由配置
│   │   │   └── index.js                 # 路由定义 + 导航守卫
│   │   │
│   │   ├── stores/                      # Pinia 状态管理（3个Store）
│   │   │   ├── auth.js                  # 认证状态（token、用户信息）
│   │   │   ├── settings.js              # 应用设置
│   │   │   └── theme.js                 # 主题状态
│   │   │
│   │   ├── views/                       # 页面视图（12个页面）
│   │   │   ├── Dashboard.vue            # 仪表板首页
│   │   │   ├── Login.vue / Register.vue  # 登录/注册
│   │   │   ├── endpoints/List.vue       # 推送接口管理（核心页面）
│   │   │   ├── channels/List.vue        # 渠道管理
│   │   │   ├── logs/List.vue            # 推送记录
│   │   │   ├── settings/Index.vue       # 用户设置（含DND免打扰）
│   │   │   ├── settings/Security.vue    # 安全设置（管理员限流配置）
│   │   │   ├── admin/Users.vue          # 用户管理（管理员）
│   │   │   ├── Docs.vue                 # API 文档页
│   │   │   ├── Debug.vue               # 调试/测试推送页
│   │   │   ├── About.vue               # 关于页面
│   │   │   └── Changelog.vue           # 更新日志页
│   │   │
│   │   ├── styles/                      # 全局样式
│   │   └── utils/                       # 前端工具
│   │       ├── request.js               # Axios 配置
│   │       └── version.js               # 版本检测工具
│   │
│   ├── vite.config.js                   # Vite 配置
│   ├── tailwind.config.js               # Tailwind 配置
│   ├── nginx.conf                       # Nginx 配置（分离部署用）
│   ├── package.json
│   └── .env
│
├── scripts/                             # 脚本目录
│   ├── start.sh                         # 本地开发启动脚本
│   ├── start-docker.sh                  # Docker 容器内启动脚本
│   ├── docker.sh                        # Docker 镜像构建推送脚本
│   └── version.js                       # 版本管理脚本
│
├── docs/                                # 文档目录
├── public/                              # 静态资源（演示图片）
├── Dockerfile                           # All-in-One Dockerfile（Express 提供静态文件）
├── docker-compose.yml                   # Docker Compose 配置（前后端分离）
├── version.json                         # 版本配置及更新日志
└── LICENSE                              # MIT 许可证
```

---

## 🏗 架构设计

### 分层架构

```
请求 → 路由层 (routes/) → 中间件层 (middleware/) → 控制器层 (controllers/) → 服务层 (services/) → 模型层 (models/)
                                                                              ↓
                                                                         SQLite 数据库
```

各层职责：

| 层 | 目录 | 职责 |
|----|------|------|
| **路由层** | `routes/` | URL 路径到控制器的映射，参数提取 |
| **中间件层** | `middleware/` | 认鉴权、限流、参数校验、错误处理（洋葱模型） |
| **控制器层** | `controllers/` | 接收请求、调用 Service、返回响应 |
| **服务层** | `services/` | 核心业务逻辑编排（推送调度、渠道选择等） |
| **模型层** | `models/` | SQL 操作封装（CRUD）、数据持久化 |

### 渠道适配器模式（策略模式）

这是本项目最核心的设计模式。每个通知渠道是一个独立的适配器类，统一继承自 `BaseChannel` 基类：

```
BaseChannel (抽象基类) — base.channel.js
  │
  ├── send(message)              -- 发送消息（必须实现）
  ├── validate(config)           -- 验证配置（必须实现）
  ├── test()                     -- 测试连接（必须实现）
  ├── getName()                  -- 渠道名称（静态方法，必须实现）
  ├── getDescription()           -- 渠道描述（静态方法，可选覆盖）
  ├── getConfigFields()          -- 动态表单字段定义（静态方法，必须实现）
  └── createProxyAgent(proxyUrl) -- 创建代理 Agent（HTTP/SOCKS，已内置实现）
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
        └── QqbotChannel          (QQ 机器人 — 开发中未启用)
```

#### BaseChannel 接口详细定义

```javascript
// 文件: server/src/services/channels/base.channel.js

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
  // @returns {Array<Object>} 字段定义数组，格式见下方
  static getConfigFields()

  // ========== 可选覆写的方法 ==========

  // 渠道描述文案（显示在前端渠道选择列表）
  // @returns {string}
  static getDescription()

  // 已内置：代理支持（HTTP/SOCKS5）
  createProxyAgent(proxyUrl) // 返回 HttpsProxyAgent 或 SocksProxyAgent
}
```

#### getConfigFields() 动态表单字段格式

```javascript
// 返回值示例（以 Telegram 为例）:
static getConfigFields() {
  return [
    {
      name: 'botToken',           // 字段名（对应 config 对象的 key）
      label: 'Bot Token',         // 显示标签
      type: 'text',               // 字段类型: text | textarea | number | password | select | switch
      required: true,             // 是否必填
      placeholder: '输入 Telegram Bot Token',  // 占位提示
      // type='select' 时需要 options:
      // options: [{ label: '选项A', value: 'a' }],
      // type='switch' 时不需要其他属性
    },
    {
      name: 'chatId',
      label: 'Chat ID',
      type: 'text',
      required: true,
      placeholder: '输入 Chat ID 或频道 ID',
    },
  ];
}
```

#### 渠道注册中心 (`channels/index.js`)

所有渠道在 `index.js` 中集中注册：

```javascript
// 1. 在文件顶部引入新渠道
const XxxChannel = require('./xxx.channel');

// 2. 在映射表中添加
const channelAdapters = {
  ...已有渠道,
  xxx: XxxChannel,  // key = getName() 的返回值
};

// 3. 导出（getChannelTypes 会自动将新渠道暴露给前端）
module.exports = {
  ...,
  getChannelAdapter,    // 根据类型创建实例
  getChannelTypes,      // 返回所有渠道的名称/描述/字段定义（供前端渲染列表）
  validateChannelConfig,// 验证配置
};
```

### 推送核心流程

```
外部推送请求
     │
     ▼
┌─────────────────────┐
│ Token 校验 / 认证校验  │  ← pushByToken / pushByEndpoint / pushByChannel 三种入口
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 关键词过滤检查        │  ← KeywordFilterService（黑名单/白名单模式，每接口独立配置）
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
│  独立的时间段配置       │     匹配时: 记录 skipped_dnd 日志，跳过实际推送
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 创建 push_log        │  ← status = 'pending'
│ (pending)            │
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

---

## 🔗 API 路由总览

| 方法 | 路径 | 功能 | 认证 | 说明 |
|------|------|------|------|------|
| GET | `/api/health` | 健康检查 | 公开(限流) | 含 DB 状态、用户数、注册开关 |
| GET | `/api/version` | 版本信息 | 公开 | 当前版本号和显示名 |
| POST | `/api/auth/login` | 登录 | 公开 | 返回 accessToken + refreshToken |
| POST | `/api/auth/register` | 注册 | 公开 | 受 registration_enabled 控制 |
| POST | `/api/auth/refresh` | 刷新Token | 公开 | 用 refreshToken 换新 accessToken |
| GET | `/api/users/me` | 当前用户信息 | 需认证 | 含角色、统计数据 |
| PUT | `/api/users/me` | 更新个人信息 | 需认证 | 修改用户名/邮箱/头像 |
| **CRUD** | `/api/channels/*` | 渠道管理 | 需认证 | 增删改查 + 测试发送 |
| **CRUD** | `/api/endpoints/*` | 推送接口管理 | 需认证 | 增删改查 + 渠道绑定/解绑 |
| POST | `/api/push/:token` | 通过Token推送 | Token鉴权 | 核心推送入口 |
| POST | `/api/push/by-endpoint/:id` | 通过接口ID推送 | 需认证 | 指定接口推送 |
| POST | `/api/push/by-channel/:id` | 通过渠道ID推送 | 需认证 | 指定渠道推送 |
| POST | `/api/inbound/*` | 入站Webhook接收 | 需接口token | 接收外部事件并转发推送 |
| GET | `/api/logs/*` | 推送记录查询 | 需认证 | 分页+多维度筛选 |
| */* | `/api/admin/*` | 管理员功能 | 需Admin | 用户管理、限流配置、系统设置 |
| */* | `/api/yuanbaobot/*` | 元宝Bot回调 | 需认证 | Bot 事件处理 |
| */* | `/api/clawbot/*` | 龙虾机器人回调 | 需认证 | 绑定确认 |

### 推送消息 API

支持三种调用方式：

#### 方式1: Token 在 URL 路径中 (GET/POST)

```bash
# GET 请求（适合简单测试）
curl "http://localhost:3000/api/push/{your_token}?title=标题&content=内容&type=text"

# POST 请求
curl -X POST http://localhost:3000/api/push/{your_token} \
  -H "Content-Type: application/json" \
  -d '{"title": "消息标题", "content": "消息内容", "type": "text"}'
```

#### 方式2: Token 在 Authorization 头中 (POST) — 推荐

更安全的方式，Token 不暴露在 URL 中。

```bash
curl -X POST http://localhost:3000/api/push \
  -H "Authorization: Bearer {your_token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "消息标题", "content": "消息内容", "type": "text"}'
```

**推送请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 消息标题 |
| content | string | 是 | 消息内容 |
| type | string | 否 | 消息类型: `text` / `markdown` / `html`，默认 text |
| url | string | 否 | 消息跳转链接（部分渠道支持） |

**推送响应格式：**

```json
{
  "success": true,
  "total": 2,
  "successCount": 2,
  "failedCount": 0,
  "results": [
    { "success": true, "channelId": 1, "channelType": "telegram", "logId": 101 },
    { "success": true, "channelId": 2, "channelType": "bark", "logId": 102 }
  ]
}
```

### 认证流程

1. 注册/登录获取 `accessToken` 和 `refreshToken`
2. 请求头携带: `Authorization: Bearer {accessToken}`
3. 当 `accessToken` 过期时（15分钟默认），使用 `refreshToken`（7天默认）换取新的令牌对
4. 前端 Axios 拦截器自动处理无感刷新

---

## 🗄 数据库设计

### 存储引擎

| 属性 | 说明 |
|------|------|
| **数据库** | SQLite3 (better-sqlite3 同步 API) |
| **文件路径** | 默认 `./data/push_service.db`（可通过 `DB_PATH` 环境变量配置） |
| **日志模式** | WAL (Write-Ahead Logging)，提升并发读写性能 |
| **外键约束** | 已启用 |
| **时区** | 默认东八区 `Asia/Shanghai`（可通过 `TZ` 环境变量覆盖） |
| **持久化** | Docker 部署时通过 Volume 挂载到宿主机 |

### ER 关系

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

### 表结构详情

#### users — 用户表

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

#### channels — 渠道配置表

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

#### endpoints — 推送接口表

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

#### endpoint_channels — 接口-渠道多对多关联表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| endpoint_id | INTEGER | FK → endpoints(id) CASCADE | 接口 ID |
| channel_id | INTEGER | FK → channels(id) CASCADE | 渠道 ID |
| UNIQUE(endpoint_id, channel_id) | | | 同一接口不能重复绑定同一渠道 |
| created_at | DATETIME | DEFAULT now | 绑定时间 |

#### push_logs — 推送记录表

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

#### refresh_tokens — 刷新令牌表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 主键 |
| user_id | INTEGER | FK → users(id) CASCADE | 用户 ID |
| token | TEXT | NOT NULL UNIQUE | 刷新令牌值 |
| expires_at | DATETIME | NOT NULL | 过期时间 |
| created_at | DATETIME | DEFAULT now | 创建时间 |

#### system_settings — 系统设置表（KV 键值对）

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

### 数据库迁移策略

采用 **try-catch ALTER TABLE** 的增量迁移方式，在 `database/init.js` 中逐步添加新字段：
- 字段已存在时静默忽略（catch 后不做处理）
- 新字段带默认值，不影响现有数据

已执行的迁移历史：ip、endpoint_name、inbound_config、keyword_filter、do_not_disturb、role 等

---

## 🔒 中间件体系

采用 Express 洋葱模型的中间件链，按执行顺序排列：

### 1. 全局中间件（app.js 级别）

| 中间件 | 位置 | 功能 |
|--------|------|------|
| CORS | app.js | 跨域访问控制 |
| express.json() | app.js | JSON 请求体解析 |
| errorMiddleware | app.js | 全局错误捕获（404/500） |

### 2. 路由级中间件

| 中间件 | 文件 | 功能 |
|--------|------|------|
| **auth middleware** | `middleware/auth.middleware.js` | JWT access token 校验，解析用户身份 |
| **rate limit middleware** | `middleware/rateLimit.middleware.js` | 三层限流：<br>- 全局限流<br>- IP 级限流<br>- 接口级限流<br>管理员可通过 API 动态调整额度 |
| **validator middleware** | `middleware/validator.middleware.js` | 基于 express-validator 的请求参数校验规则 |

### 3. 限流层级详情

| 层级 | 默认限制 | 说明 |
|------|----------|------|
| **全局限流** | 100 req/min | 所有请求的全局上限 |
| **IP 级限流** | 60 req/min | 按 IP 地址限制 |
| **健康检查** | 30 req/min | health 接口独立限流 |

---

## ⚙️ 服务层说明

| 服务文件 | 职责 |
|----------|------|
| **push.service.js** | 核心：推送调度引擎，三种入口（Token/Endpoint/Channel），编排 DND→创建日志→遍历渠道→发送→更新状态的完整流程 |
| **channel.service.js** | 渠道的增删改查逻辑，包含配置的序列化/反序列化 |
| **endpoint.service.js** | 推送接口的管理逻辑，包含渠道绑定/解绑、Token 管理 |
| **inbound.service.js** | 入站 Webhook 接收后，根据 inbound_config 的数据来源模板（JSONPath）提取 title/content，再转发到关联渠道推送 |
| **keywordFilter.service.js** | 关键词过滤：黑名单（命中即拦截）和白名单（命中才放行）两种模式 |
| **doNotDisturb.service.js** | 免打扰判断：支持最多 5 个时间段配置，支持跨天时间段（如 23:00-06:00） |
| **rateLimitConfig.service.js** | 限流额度的动态读写（仅管理员可操作） |
| **auth.service.js** | 登录/注册/刷新 token 的业务逻辑 |
| **log.service.js** | 推送记录的多条件查询（分页、筛选、排序） |
| **clawbot-monitor.js** | 微信龙虾机器人的后台长轮询监控进程，自动获取 context_token |
| **yuanbaobot-monitor.js** | 元宝 Bot 的 WebSocket 连接管理，支持多实例监控，处理入站事件 |

---

## 🎨 前端架构

### 路由与页面

| 路径 | 页面 | 权限 | 功能描述 |
|------|------|------|----------|
| `/login` | 登录 | 公开 | 邮箱+密码登录 |
| `/register` | 注册 | 公开 | 邮箱注册（可由管理员开关） |
| `/` | Dashboard | 已登录 | 统计卡片（接口数/渠道数/今日推送/总推送）+ 最近推送记录列表 |
| `/endpoints` | 接口管理 | 已登录 | CRUD 接口、Token 复制、渠道绑定/解绑、关键词过滤、DND 配置、入站 Webhook 配置 |
| `/channels` | 渠道管理 | 已登录 | CRUD 渠道、动态配置表单（根据渠道类型的 `getConfigFields()` 自动渲染不同字段）、测试发送按钮 |
| `/logs` | 推送记录 | 已登录 | 分页查看推送记录，按渠道类型/状态/时间范围/关键词筛选 |
| `/settings` | 个人设置 | 已登录 | 修改用户名/邮箱/密码、导出配置 JSON、DND 全局开关、注册开关（管理员可见） |
| `/settings/security` | 安全设置 | Admin | 动态调整三层限流的额度、全局限流开关 |
| `/users` | 用户管理 | Admin | 用户列表/搜索/编辑/删除 |
| `/docs` | API 文档 | 已登录 | API 使用说明（静态文档页面） |
| `/debug` | 调试测试 | 已登录 | 在线测试推送（选择接口、填写消息、查看实时结果） |
| `/about` | 关于 | 已登录 | 项目介绍、支持渠道图标墙展示 |
| `/changelog` | 更新日志 | 已登录 | 从 CDN 远程加载 version.json 展示版本历史 |

### 前端特色功能

- **深色主题**: Element Plus dark mode + Tailwind dark: 前缀，支持切换
- **响应式布局**: 移动端自适应
- **版本检测**: 启动时从远程 CDN 获取 version.json 检测更新，有新版弹窗提示
- **自动 Token 刷新**: Axios 拦截器实现 401 时无感刷新 access token
- **动态渠道表单**: 渠道配置页面完全由后端 `getConfigFields()` 驱动，新增渠道无需改动前端代码

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm

### 安装依赖

```bash
# 后端依赖
cd server && npm install

# 前端依赖
cd web && npm install
```

### 初始化数据库

```bash
cd server && npm run init-db
```

初始化会自动：
1. 创建全部 7 张表及索引
2. 执行所有增量迁移（ALTER TABLE）
3. 开发环境下自动创建默认测试账号: **admin / admin123**
4. 执行 WAL checkpoint 将数据同步到磁盘

### 启动服务

```bash
# 方式一：使用启动脚本（同时启动前后端）
bash ./scripts/start.sh

# 方式二：分别启动
cd server && npm start          # 后端 :3000
cd web && npm run dev           # 前端 :5173（Vite dev server）

# 方式三：Docker 一键启动
docker compose up -d            # 前后端分离模式
# 或
docker build -t magicpush . && docker run -p 3000:3000 magicpush  # All-in-One 模式
```

访问地址：
- 前端界面: http://localhost:5173
- 后端 API: http://localhost:3000

---

## 🔐 环境变量

后端 `.env` 配置：

```env
NODE_ENV=development                # 可选: development / production
JWT_SECRET=your-secret-key          # 可选，不设置则自动生成安全随机密钥
JWT_ACCESS_EXPIRES_IN=15m           # 可选，access token 有效期，默认 15 分钟
JWT_REFRESH_EXPIRES_IN=7d           # 可选，refresh token 有效期，默认 7 天
DB_PATH=./data/push_service.db      # 可选，SQLite 数据库文件路径
LOG_LEVEL=info                      # 可选: error / warn / info / debug
TZ=Asia/Shanghai                   # 可选，时区设置，默认 Asia/Shanghai
FRONTEND_URL=http://localhost:5173  # 可选，生产环境的 CORS 前端地址
PORT=3000                          # 可选，后端监听端口，默认 3000
```

---

## 📝 开发指南

### 添加新的消息渠道

只需 3 个步骤，无需修改前端代码：

#### 步骤 1：创建渠道适配器

在 `server/src/services/channels/` 下新建文件（如 `mychannel.channel.js`）：

```javascript
const BaseChannel = require('./base.channel');
const axios = require('axios');

class MyChannel extends BaseChannel {
  constructor(config, channelId) {
    super(config);
    this.channelId = channelId;
  }

  /**
   * 发送消息 — 必须实现
   */
  async send({ title, content, type }) {
    const apiUrl = 'https://api.example.com/send';

    const response = await axios.post(apiUrl, {
      api_key: this.config.apiKey,
      title: title,
      body: content,
      // 根据渠道 API 文档构造请求...
    });

    return { success: true, messageId: response.data.id };
  }

  /**
   * 验证配置 — 必须实现
   */
  validate(config) {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return { valid: false, message: 'API Key 不能为空' };
    }
    return { valid: true };
  }

  /**
   * 测试连接 — 必须实现
   */
  async test() {
    try {
      await this.send({ title: '测试消息', content: '来自 MagicPush 的测试', type: 'text' });
      return { success: true, message: '测试发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 渠道唯一标识 — 静态方法，必须实现
   * @returns {string} 小写英文字母
   */
  static getName() {
    return 'mychannel';
  }

  /**
   * 渠道描述 — 静态方法，可选覆写
   */
  static getDescription() {
    return '我的自定义渠道（示例）';
  }

  /**
   * 配置表单字段定义 — 静态方法，必须实现
   * 前端会根据此定义自动渲染配置表单
   */
  static getConfigFields() {
    return [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        required: true,
        placeholder: '请输入 API Key',
      },
      {
        name: 'secret',
        label: '密钥',
        type: 'password',
        required: false,
        placeholder: '可选，用于签名',
      },
    ];
  }
}

module.exports = MyChannel;
```

#### 步骤 2：注册渠道

编辑 `server/src/services/channels/index.js`：

```javascript
// 顶部添加引用
const MyChannel = require('./mychannel.channel');

// 在 channelAdapters 映射对象中添加
const channelAdapters = {
  // ... 已有渠道
  mychannel: MyChannel,  // key 必须和 getName() 返回值一致
};
```

#### 步骤 3：添加验证白名单

编辑 `server/src/middleware/validator.middleware.js`，在 `createChannelValidation` 的 `isIn` 白名单中加入新渠道类型：

```javascript
.isIn(['wechatclawbot', 'wecom', 'telegram', /* ...已有渠道 */, 'mychannel'])
```

> **注意**：此步骤容易被遗漏，遗漏会导致前端报「不支持的渠道类型」错误。

#### 步骤 4：重启服务

重启后端服务，新渠道即可在前端「渠道管理」页面看到和使用。

> **无需任何前端改动！** 前端的渠道列表、配置表单、测试发送等功能全部通过 `getChannelTypes()` API 动态获取。

#### 高级特性（可选）

- **代理支持**: 如果渠道服务器在国内无法直接访问，可在适配器的 `send()` 中调用 `this.createProxyAgent(proxyUrl)` 创建代理 agent 传给 axios
- **Markdown/HTML 支持**: 根据 `message.type` 字段对不同消息类型做不同的格式化处理（如 Telegram 支持 Markdown，邮件支持 HTML）
- **URL 附件**: 部分渠道支持消息附带跳转链接，使用 `message.url` 字段

### 添加入站配置数据来源模板

在 `server/src/utils/jsonpath.js` 的 `PRESET_TEMPLATES` 对象中添加新模板：

```javascript
const PRESET_TEMPLATES = {
  // 现有模板...

  jenkins: {
    name: 'Jenkins',                    // 显示名称
    description: 'Jenkins 构建通知',     // 描述文字
    fieldMapping: {
      title: '$.name',                  // 标题的 JSONPath 表达式
      content: '$.build.full_url',      // 内容的 JSONPath 表达式
    },
    defaultValues: {
      type: 'text',                     // 消息类型: text / markdown / html
    },
  },
};
```

**模板字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 显示名称 |
| `description` | string | 描述文字 |
| `fieldMapping.title` | string | 标题的 JSONPath 表达式 |
| `fieldMapping.content` | string | 内容的 JSONPath 表达式 |
| `defaultValues.type` | string | 消息类型：`text` / `markdown` / `html` |

前端通过 API 自动获取模板列表，无需修改前端代码。

---

## 🐛 故障排除

### 常见问题

1. **端口被占用**
   - 后端固定使用 `3000` 端口（可通过 `PORT` 环境变量修改）
   - 修改 `web/vite.config.js` 中的 `server.port` 可更改前端开发端口

2. **数据库权限错误**
   - 确保 `server/data/` 目录有写入权限
   - 或通过 `DB_PATH` 环境变量指定其他有权限的位置

3. **CORS 错误**
   - 检查 `server/src/app.js` 中的 CORS 配置
   - 生产环境确保设置了正确的 `FRONTEND_URL` 环境变量

4. **推送失败但配置正确**
   - 检查目标渠道服务是否可用（网络可达性）
   - 如果渠道服务器在国外，考虑在渠道配置中使用代理
   - 查看 `server/data/` 目录下的日志文件（或控制台输出）

5. **内存占用过高**
   - 项目内置 V8 堆监控：当堆使用率超过 80% 且总量 >50MB 时会告警
   - 检查是否有推送任务堆积或 WebSocket 连接泄漏

---

## 📋 已支持的渠道列表

| 渠道 | 类型标识 | 必需配置 | 说明 |
|------|----------|---------|------|
| 微信龙虾机器人 | wechatclawbot | 扫码绑定（自动获取配置） | 微信个人号推送 |
| 元宝 Bot | yuanbaobot | appKey, appSecret | 元宝平台机器人 |
| 企业微信 | wecom | key (机器人Key) | 群机器人 Webhook |
| Telegram | telegram | botToken, chatId | Telegram Bot 推送 |
| PushPlus | pushplus | token | 推加+一站式推送 |
| WxPusher | wxpusher | appToken | 微信渠道推送 |
| 飞书 | feishu | webhookUrl | 飞书群机器人 |
| 钉钉 | dingtalk | webhookUrl | 钉钉群机器人 |
| 微信公众号 | wechat_official | appId, appSecret, templateId, openIds | 模板消息推送 |
| Server酱 | serverchan | sendKey | Server酱微信推送 |
| Webhook | webhook | url, method | 通用 Webhook 转发 |
| SMTP邮件 | smtp | host, port, user, pass, to | 邮件推送 |
| Gotify | gotify | serverUrl, token | 自托管推送 |
| Bark | bark | serverUrl, deviceKey | iOS 推送 |
| Meow | meow | nickname | 喵喵推送 |
| 企业微信应用 | wecomapp | corpid, corpsecret, agentid, touser | 应用消息推送 |
| 息知 | xizhi | pushMode, key | 息知推送 |
| PushMe | pushme | key | 推推 |