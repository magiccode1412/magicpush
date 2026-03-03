# ![logo](public/favicon.svg)MagicPush

一个支持多种消息渠道的推送服务管理平台，用户可以通过标准化的REST API接口将消息推送到多种通知渠道。

## 项目地址
+ [CNB云原生构建](https://cnb.cool/magiccode1412/magicpush)
+ [GitHub](https://github.com/magiccode1412/magicpush)

## 🌐 在线测试
网址：https://magicpush.zeabur.app/

自行注册即可

> 提示：演示环境仅作测试使用，请勿发送违规信息，数据会定期重置，请勿存储重要信息。

## 预览
![浅色预览图](public/image/Snipaste_2026-03-02_22-26-59.webp)
![深色预览图](public/image/Snipaste_2026-03-02_22-27-46.webp)

## 困境

市面上有很多消息推送服务,但是各个各的局限,例如:
  + Telegram ➡️ 最优秀的消息推送服务,但是需要魔法
  + 企业微信/钉钉/飞书 ➡️ 消息仅限于企业内部
  + 微信服务号 ➡️ 模板消息限制太多

也有一些开发者,开始转向App推送,更甚者,开始支持手机系统底层推送,例如:
+ pushplus: 支持多渠道推送,包括微信服务号/App/webhook
+ wxpusher: 支持多种手机的系统级推送,不需要App运行

其实市面上的推送服务基本都覆盖到了(**除了万恶之首的微信**),但是我们必须考虑如果作为中转的第三方推送服务宕机了,或者说不玩了,会有什么后端,得更新所有的调用代码/令牌

通过以下几张图,就会明白,自己拥有一个推送服务,是多么的有用:
+ 一对一的消息推送方式
![一对一消息推送方式](./public/image/magicpush01.png)
+ 多对一推送服务
![多对一推送服务](./public/image/magicpush02.png)
+ 使用自己的推送服务
![使用自己的推送服务](./public/image/magicpush03.png)

## ✨ 功能特性

### 消息渠道支持
- 企业微信机器人
- Telegram Bot
- PushPlus
- WxPusher
- 飞书机器人
- 钉钉机器人
- **Webhook** (通用 HTTP 推送，支持自定义 URL/Headers/Body)

### 核心功能
- 多渠道消息同时推送
- 标准化REST API
- 双令牌JWT认证机制 (access/refresh token)
- 用户注册/登录
- 渠道绑定与配置管理
- 推送接口管理（多接口/多令牌）
- 推送历史记录与状态追踪
- 响应式Web管理界面
- 深浅色主题切换

## 🐳 Docker 部署

### 使用预构建镜像

**docker命令**

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/app/server/data \
  magiccode1412/magicpush:latest
```

**docker compose**

```yml
services:
  app:
    image: magiccode1412/magicpush:latest # 国外用这个
    #image: docker.cnb.cool/magiccode1412/magicpush:latest # 国内用这个
    ports:
      - "3000:3000"
    # environment:
      # - JWT_SECRET=your-secret-key # 可选，不设置则自动生成安全密钥
    volumes:
      - ./data:/app/data
    network_mode: bridge
    container_name: magicpush
```

访问：http://localhost:3000

### 手动构建

**分离部署前后端**

支持更灵活的配置，这种方法需要拉取项目自行构建

```bash
docker-compose up -d
```

**单一镜像**
```bash
docker build -t magicpush .
```

访问：http://localhost:80

## 🛠️ 技术栈

### 后端
- Node.js 18+
- Express.js 4.x
- SQLite3 (better-sqlite3)
- JWT (jsonwebtoken)
- bcryptjs (密码加密)

### 前端
- Vue 3 (Composition API)
- Vite 5.x
- Tailwind CSS 3.x
- Element Plus
- Pinia (状态管理)
- Vue Router 4.x

## 📁 项目结构

```
/workspace/
├── server/              # 后端项目
│   ├── src/
│   │   ├── config/      # 配置文件
│   │   ├── controllers/ # 控制器
│   │   ├── middleware/  # 中间件
│   │   ├── models/      # 数据模型
│   │   ├── routes/      # 路由定义
│   │   ├── services/    # 业务服务
│   │   │   └── channels/# 渠道适配器
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
| 企业微信 | key (机器人Key) |
| Telegram | botToken, chatId |
| PushPlus | token (可选: topic) |
| WxPusher | appToken (可选: uids, topicIds) |
| 飞书 | webhookUrl (可选: secret) |
| 钉钉 | webhookUrl (可选: secret) |
| Webhook | url, method (可选: headers, bodyTemplate) |

## 🔐 环境变量

后端 `.env` 配置：

```env
NODE_ENV=development
# JWT_SECRET=your-secret-key        # 可选，不设置则自动生成安全密钥
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DB_PATH=./data/push_service.db
LOG_LEVEL=info
```

> **注意**：`JWT_SECRET` 为可选项。如果不设置，系统会在首次运行时自动生成一个 128 位的安全密钥并存储到数据库中。

## 📝 开发说明

### 添加新的消息渠道

1. 在 `server/src/services/channels/` 创建新的适配器类
2. 继承 `BaseChannel` 基类
3. 实现 `send()`, `validate()`, `test()` 方法
4. 在 `index.js` 中注册新渠道

### 数据库表结构

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

## 📄 许可证

MIT License
