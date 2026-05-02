# MagicPush 开发文档

## 目录

- [项目结构](#-项目结构)
- [快速开始](#-快速开始)
- [API 使用说明](#-api-使用说明)
- [环境变量](#-环境变量)
- [开发说明](#-开发说明)
- [数据库表结构](#-数据库表结构)
- [故障排除](#-故障排除)

## 📁 项目结构

```
/workspace/
├── server/              # 后端项目
│   ├── src/
│   │   ├── config/      # 配置文件
│   │   ├── controllers/ # 控制器
│   │   ├── middleware/  # 中间件
│   │   │   └── rateLimit.middleware.js # 限流中间件
│   │   ├── models/      # 数据模型
│   │   ├── routes/      # 路由定义
│   │   ├── services/    # 业务服务
│   │   │   ├── channels/# 渠道适配器
│   │   │   └── rateLimitConfig.service.js # 限流配置服务
│   │   ├── utils/       # 工具函数
│   │   └── database/    # 数据库初始化
│   ├── Dockerfile       # 后端 Dockerfile
│   ├── package.json
│   └── .env
│
├── web/                 # 前端项目
│   ├── src/
│   │   ├── api/         # API接口
│   │   ├── components/  # 组件
│   │   ├── router/      # 路由
│   │   ├── stores/      # 状态管理
│   │   ├── views/       # 页面视图
│   │   │   └── settings/ # 设置页面（含安全设置）
│   │   └── styles/      # 样式文件
│   ├── Dockerfile       # 前端 Dockerfile
│   ├── nginx.conf       # 前端 nginx 配置
│   ├── index.html       # 入口 HTML
│   ├── vite.config.js   # Vite 配置
│   ├── tailwind.config.js # Tailwind 配置
│   ├── package.json
│   └── .env
│
├── scripts/             # 脚本目录
│   ├── start.sh         # 本地开发启动脚本
│   ├── start-docker.sh  # Docker 容器内启动脚本
│   ├── docker.sh        # Docker 镜像构建推送脚本
│   └── version.js       # 版本管理脚本
│
├── docs/                # 文档目录
├── public/              # 静态资源（演示图片）
├── Dockerfile           # All-in-One Dockerfile（Express 提供静态文件）
├── docker-compose.yml   # Docker Compose 配置（前后端分离）
└── version.json         # 版本配置
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
# 后端依赖
cd server
npm install

# 前端依赖
cd web
npm install
```

### 初始化数据库

```bash
cd server
npm run init-db
```

### 启动服务

```bash
# 使用启动脚本（同时启动前后端）
bash ./scripts/start.sh

# 或分别启动
# 后端
cd server && npm start

# 前端（新终端）
cd web && npm run dev
```

访问地址：
- 前端界面: http://localhost:5173
- 后端API: http://localhost:3000

## 📖 API 使用说明

### 推送消息

支持多种调用方式：

#### 方式1: Token 在 URL 路径中 (GET/POST)

```bash
# GET 请求（适合简单测试）
curl "http://localhost:3000/api/push/{your_token}?title=标题&content=内容&type=text"

# POST 请求
curl -X POST http://localhost:3000/api/push/{your_token} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "消息标题",
    "content": "消息内容",
    "type": "text"
  }'
```

#### 方式2: Token 在 Authorization 头中 (POST) - 推荐

更安全的方式，Token 不会暴露在 URL 中

```bash
curl -X POST http://localhost:3000/api/push \
  -H "Authorization: Bearer {your_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "消息标题",
    "content": "消息内容",
    "type": "text"
  }'
```

**参数说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 消息标题 |
| content | string | 是 | 消息内容 |
| type | string | 否 | 消息类型: text/markdown/html，默认 text |

### 认证流程

1. 注册/登录获取 accessToken 和 refreshToken
2. 在请求头中携带: `Authorization: Bearer {accessToken}`
3. 当 accessToken 过期时，使用 refreshToken 换取新的令牌

### 支持的渠道配置

| 渠道 | 必需配置 |
|------|---------|
| 微信龙虾机器人 | 扫码绑定 (自动获取配置) |
| 元宝 Bot | appKey, appSecret (可选: sendTarget) |
| 企业微信 | key (机器人Key) |
| Telegram | botToken, chatId |
| PushPlus | token (可选: topic) |
| WxPusher | appToken (可选: uids, topicIds) |
| 飞书 | webhookUrl (可选: secret) |
| 钉钉 | webhookUrl (可选: secret) |
| 微信公众号 | appId, appSecret, templateId, openIds (多个用逗号分隔) |
| Server酱 | sendKey (可选: channel) |
| Webhook | url, method (可选: headers, bodyTemplate) |
| SMTP邮件 | host, port, user, pass, to (可选: secure, from) |
| Gotify | serverUrl, token (可选: priority) |
| Bark | serverUrl, deviceKey (可选: group, sound, level, icon) |
| Meow | nickname (可选: type) |
| 企业微信应用 | corpid, corpsecret, agentid, touser (可选: type) |
| 息知 | pushMode (single/channel), key 或 channelKey |

> **微信龙虾机器人限制说明：** 机器人连续主动发送 10 条消息后，需用户主动发送一条消息才能继续推送；自用户上次主动发消息起 24 小时后，也需主动发消息才能继续推送。系统会在接近限额时自动在消息中提醒用户。

## 🔐 环境变量

后端 `.env` 配置：

```env
NODE_ENV=development                # 可选
JWT_SECRET=your-secret-key          # 可选，不设置则自动生成安全密钥
JWT_ACCESS_EXPIRES_IN=15m           # 可选，默认 15 分钟
JWT_REFRESH_EXPIRES_IN=7d           # 可选，默认 7 天
DB_PATH=./data/push_service.db      # 可选
LOG_LEVEL=info                      # 可选，默认 info
```

## 📝 开发说明

### 添加新的消息渠道

1. 在 `server/src/services/channels/` 创建新的适配器类
2. 继承 `BaseChannel` 基类
3. 实现 `send()`, `validate()`, `test()` 方法
4. 在 `index.js` 中注册新渠道

### 添加入站配置数据来源模板

在 `server/src/utils/jsonpath.js` 的 `PRESET_TEMPLATES` 对象中添加新模板：

```javascript
const PRESET_TEMPLATES = {
  // 现有模板...
  
  // 添加新模板
  jenkins: {
    name: 'Jenkins',                    // 显示名称
    description: 'Jenkins 构建通知',     // 描述文字
    fieldMapping: {
      title: '$.name',                  // 标题的 JSONPath 表达式
      content: '$.build.full_url',      // 内容的 JSONPath 表达式
    },
    defaultValues: {
      type: 'text',                     // 消息类型: text/markdown/html
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

## 数据库表结构

- `users` - 用户信息
- `channels` - 渠道配置
- `endpoints` - 推送接口
- `endpoint_channels` - 接口-渠道关联
- `push_logs` - 推送记录
- `refresh_tokens` - 刷新令牌
- `system_settings` - 系统设置（如注册开关）

## 🐛 故障排除

### 常见问题

1. **端口被占用**
   - 后端固定使用 `3000` 端口
   - 修改 `web/vite.config.js` 中的 `server.port` 可更改前端开发端口

2. **数据库权限错误**
   - 确保 `server/data/` 目录有写入权限
   - 或修改 `DB_PATH` 到其他有权限的位置

3. **CORS 错误**
   - 检查 `server/src/app.js` 中的 CORS 配置
   - 生产环境确保设置了正确的 `FRONTEND_URL`
