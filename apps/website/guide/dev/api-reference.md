# API 接口文档

本文档列出 MagicPush 后端的所有 RESTful API 接口。

---

## 目录

- [1. 基础信息](#1-基础信息)
- [2. 公开接口](#2-公开接口)
- [3. 认证接口](#3-认证接口)
- [4. 用户接口](#4-用户接口)
- [5. 渠道管理](#5-渠道管理)
- [6. 接口管理](#6-接口管理)
- [7. 消息推送](#7-消息推送)
- [8. 入站 Webhook](#8-入站-webhook)
- [9. 推送记录](#9-推送记录)
- [10. 管理员接口](#10-管理员接口)

---

## 1. 基础信息

### 请求基础 URL

```
生产环境: https://your-domain.com/api
开发环境: http://localhost:3000/api
```

### 认证方式

| 方式 | 适用场景 | 说明 |
|------|----------|------|
| **Bearer Token** | 需要登录的接口 | 请求头 `Authorization: Bearer {accessToken}` |
| **URL Token** | 推送接口 | 路径参数 `/api/push/{token}` |

### 统一响应格式

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": { ... },
  "timestamp": 1704067200000
}
```

---

## 2. 公开接口

### 2.1 健康检查

```http
GET /api/health
```

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "userCount": 10,
    "registrationEnabled": true
  }
}
```

> 独立限流：30 req/min。

### 2.2 版本信息

```http
GET /api/version
```

```json
{
  "success": true,
  "data": { "version": "1.12.0", "displayName": "v1.12.0" }
}
```

---

## 3. 认证接口

### 3.1 登录

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "password" }
```

返回 `accessToken` + `refreshToken`（有效期分别为 15 分钟和 7 天）。

### 3.2 注册

```http
POST /api/auth/register
Content-Type: application/json

{ "email": "user@example.com", "username": "myname", "password": "password" }
```

> 受 `registration_enabled` 系统设置控制是否开放。

### 3.3 刷新 Token

```http
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJhbGci..." }
```

返回新的令牌对。前端 Axios 拦截器会在收到 401 时自动调用此接口实现无感刷新。

---

## 4. 用户接口

需认证 (`Authorization: Bearer {token}`)。

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/users/me` | 当前用户信息（含角色、统计数据） |
| PUT | `/api/users/me` | 更新个人信息（用户名/邮箱/头像） |

---

## 5. 渠道管理

需认证，完整 CRUD。

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/channels` | 渠道列表 |
| POST | `/api/channels` | 创建渠道 |
| GET | `/api/channels/:id` | 渠道详情 |
| PUT | `/api/channels/:id` | 更新渠道 |
| DELETE | `/api/channels/:id` | 删除渠道 |
| POST | `/api/channels/:id/test` | 测试发送 |
| GET | `/api/channels/types` | 所有可用渠道类型及字段定义 |

**创建示例：**
```json
POST /api/channels
{
  "channel_type": "telegram",
  "name": "我的 Telegram",
  "config": { "botToken": "...", "chatId": "-100xxx" }
}
```

---

## 6. 接口管理

需认证。

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/endpoints` | 接口列表 |
| POST | `/api/endpoints` | 创建接口 |
| GET | `/api/endpoints/:id` | 接口详情 |
| PUT | `/api/endpoints/:id` | 更新接口 |
| DELETE | `/api/endpoints/:id` | 删除接口 |
| POST | `/api/endpoints/:id/bind-channel` | 绑定渠道 |
| POST | `/api/endpoints/:id/unbind-channel/:channelId` | 解绑渠道 |
| POST | `/api/endpoints/:id/regenerate-token` | 重置 Token |

---

## 7. 消息推送

### 7.1 通过 Token 推送（外部调用推荐）

```bash
# GET 方式（简单场景）
curl "http://localhost:3000/api/push/{token}?title=标题&content=内容&type=text"

# POST 方式
curl -X POST "http://localhost:3000/api/push/{token}" \
  -H "Content-Type: application/json" \
  -d '{"title":"标题","content":"内容","type":"text"}'

# Header 携带 Token（最安全）
curl -X POST "http://localhost:3000/api/push" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title":"标题","content":"内容","type":"markdown","url":"https://..."}'
```

**请求参数：**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 否 | - | 消息标题 |
| content | string | 是 | - | 消息正文 |
| type | string | 否 | text | `text` / `markdown` / `html` |
| url | string | 否 | - | 跳转链接（部分渠道支持） |

**推送响应：**

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

### 7.2 通过接口 ID / 渠道 ID 推送

| 路径 | 说明 |
|------|------|
| `POST /api/push/by-endpoint/:id` | 通过接口 ID 推送 |
| `POST /api/push/by-channel/:id` | 通过渠道 ID 推送 |

两者均需 JWT 认证。

---

## 8. 入站 Webhook

接收外部系统事件，按模板解析后转发到关联渠道。

```http
POST /api/inbound/:endpointToken
Content-Type: application/json

{ ... 外部事件的原始 JSON 数据 ... }
```

处理流程：
1. 根据 `endpointToken` 找到对应接口
2. 读取 `inbound_config` 中的数据来源模板
3. 用 JSONPath 从原始数据中提取 title 和 content
4. 转发到该接口关联的所有渠道

---

## 9. 推送记录

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/logs` | 分页查询推送记录 |
| GET | `/api/logs/stats` | 统计概览 |

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认 1 |
| pageSize | number | 每页条数，默认 20 |
| channelType | string | 按渠道类型筛选 |
| status | string | 按 status 筛选: success/failed/skipped_dnd |
| keyword | string | 关键词搜索标题和内容 |
| startDate | string | 开始日期 (YYYY-MM-DD) |
| endDate | string | 结束日期 (YYYY-MM-DD) |

---

## 10. 管理员接口

需要 Admin 角色 (`role = 'admin'`)。

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/users` | 用户列表（分页+搜索） |
| PUT | `/api/admin/users/:id` | 编辑用户（角色、状态） |
| DELETE | `/api/admin/users/:id` | 删除用户 |
| GET | `/api/admin/settings` | 系统设置列表 |
| PUT | `/api/admin/settings` | 更新系统设置 |
| GET | `/api/admin/rate-limits` | 当前列限流配置 |
| PUT | `/api/admin/rate-limits` | 动态调整限流额度 |
