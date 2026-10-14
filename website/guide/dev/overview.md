# MagicPush 开发文档

MagicPush 的完整开发者文档入口。本文档涵盖项目架构、开发规范、API 参考、数据库设计等所有开发相关信息。

---

## 项目概述

| 属性 | 详情 |
|------|------|
| **项目名称** | MagicPush |
| **当前版本** | v1.12.0 |
| **项目定位** | 支持多种消息渠道的推送服务管理平台（统一消息推送网关） |
| **开源协议** | MIT License |
| **运行时要求** | Node.js >= 18.0.0, npm >= 9.0.0 |

> MagicPush 解决的核心问题：**通过一个标准化的 REST API，将消息同时推送到多种第三方通知渠道**（微信 / Telegram / 飞书 / 钉钉 / 邮件等），支持关键词过滤、免打扰时段、入站 Webhook 转发等企业级功能。

---

## 文档导航

### 入门

| 文档 | 说明 |
|------|------|
| [快速开始](#-快速开始) | 环境搭建、安装依赖、启动服务 |

### 架构与设计

| 文档 | 说明 |
|------|------|
| [架构设计](./architecture.md) | 分层架构、渠道适配器模式、推送核心流程、中间件体系、服务层职责划分 |
| [数据库设计](./database.md) | 存储引擎、ER 关系、7 张表结构详情、迁移策略 |
| [API 接口文档](./api-reference.md) | 全部 RESTful 接口列表、请求参数、响应格式 |

### 开发规范

| 文档 | 说明 |
|------|------|
| [命名规范](./naming-conventions.md) | 文件名、变量、函数、类、数据库字段、前端组件的全栈命名约定 |
| [代码风格规范](./coding-standards.md) | 注释规范、错误处理模式、异步编程惯例、模块导入导出、日志和响应格式 |
| [后端开发指南](./backend-development.md) | 新增 CRUD 模块的标准步骤：Model → Service → Controller → Route → 注册路由 |
| [前端开发指南](./frontend-guide.md) | Vue 3 + Pinia 组件规范、路由组织、API 封装、状态管理、样式方案 |

### 扩展开发

| 文档 | 说明 |
|------|------|
| [新增渠道开发指南](./new-channel-guide.md) | 完整的新增消息渠道教程：适配器实现、注册流程、字段定义、测试验证 |

---

## 技术栈

### 后端

| 技术 | 用途 |
|------|------|
| **Node.js 18+** | 运行时环境 |
| **Express.js 4.x** | Web 框架 / REST API |
| **SQLite3 (better-sqlite3)** | 数据库存储（同步 API，WAL 模式） |
| **JWT (jsonwebtoken)** | 双令牌认证机制（access + refresh token） |
| **express-rate-limit** | 三层限流防护（全局/IP级/接口级） |
| **axios** | HTTP 客户端（调用各渠道 API） |
| **winston** | 日志管理 |

### 前端

| 技术 | 用途 |
|------|------|
| **Vue 3 (Composition API)** | 前端框架 |
| **Vite** | 构建工具 |
| **Element Plus** | UI 组件库 |
| **Tailwind CSS** | 原子化 CSS 框架 |
| **Pinia** | 状态管理 |
| **Vue Router 4** | 路由管理 |

---

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm

### 安装与启动

```bash
# 后端
cd server && npm install

# 前端
cd web && npm install

# 初始化数据库（自动创建表 + 测试账号 admin/admin123）
cd server && npm run init-db

# 方式一：启动脚本（同时启动前后端）
bash ./scripts/start.sh

# 方式二：分别启动
cd server && npm start          # 后端 :3000
cd web && npm run dev           # 前端 :5173

# 方式三：Docker
docker compose up -d            # 前后端分离模式
```

访问地址：
- 前端界面: http://localhost:5173
- 后端 API: http://localhost:3000

---

## 环境变量

后端 `.env` 配置：

```env
NODE_ENV=development                # development / production
JWT_SECRET=your-secret-key          # 不设置则自动生成安全随机密钥
JWT_ACCESS_EXPIRES_IN=15m           # access token 有效期，默认 15 分钟
JWT_REFRESH_EXPIRES_IN=7d           # refreshToken 有效期，默认 7 天
DB_PATH=./data/push_service.db      # SQLite 数据库文件路径
LOG_LEVEL=info                      # error / warn / info / debug
TZ=Asia/Shanghai                   # 时区，默认 Asia/Shanghai
FRONTEND_URL=http://localhost:5173  # CORS 前端地址
PORT=3000                          # 监听端口，默认 3000
```

---

## 已支持的渠道列表

| 渠道 | 类型标识 | 必需配置 | 说明 |
|------|----------|---------|------|
| 微信龙虾机器人 | wechatclawbot | 扫码绑定 | 微信个人号推送 |
| 元宝 Bot | yuanbaobot | appKey, appSecret | 元宝平台机器人 |
| 企业微信 | wecom | key | 群机器人 Webhook |
| Telegram | telegram | botToken, chatId | Telegram Bot 推送 |
| PushPlus | pushplus | token | 推加+一站式推送 |
| WxPusher | wxpusher | appToken | 微信渠道推送 |
| 飞书 | feishu | webhookUrl | 飞书群机器人 |
| 钉钉 | dingtalk | webhookUrl | 钉钉群机器人 |
| 微信公众号 | wechat_official | appId, appSecret, templateId | 模板消息推送 |
| Server酱 | serverchan | sendKey | Server酱微信推送 |
| Webhook | webhook | url, method | 通用 Webhook 转发 |
| SMTP邮件 | smtp | host, port, user, pass, to | 邮件推送 |
| Gotify | gotify | serverUrl, token | 自托管推送 |
| Bark | bark | serverUrl, deviceKey | iOS 推送 |
| Meow | meow | nickname | 喵喵推送 |
| 企业微信应用 | wecomapp | corpid, corpsecret, agentid, touser | 应用消息推送 |
| 息知 | xizhi | pushMode, key | 息知推送 |
| PushMe | pushme | key | 推推 |
| MQTT | mqtt | brokerUrl, topic | MQTT 协议发布消息 |

---

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| **端口被占用** | 修改 `PORT` 环境变量或 `web/vite.config.js` 的 `server.port` |
| **数据库权限错误** | 确保 `server/data/` 目录有写入权限，或通过 `DB_PATH` 指定其他位置 |
| **CORS 错误** | 检查 `FRONTEND_URL` 是否正确设置 |
| **推送失败但配置正确** | 检查目标服务网络可达性；境外服务考虑使用代理；查看日志文件 |
| **内存占用过高** | 检查是否有任务堆积或连接泄漏；内置 V8 堆监控会在超过 80% 时告警 |
