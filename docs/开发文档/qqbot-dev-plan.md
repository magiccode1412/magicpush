# QQ 官方机器人通知渠道 - 开发文档

> 状态：**开发中（暂停）**
> 最后更新：2026-03-30

## 一、概述

将 QQ 官方机器人作为新的通知渠道集成到 MagicPush，允许用户通过 QQ 接收推送消息。

QQ 机器人支持三种开发场景：

| 场景 | 说明 | API 路径 |
|------|------|---------|
| **QQ 频道** | 机器人被添加到 QQ 频道的子频道中 | `POST /channels/:channelID/messages` |
| **QQ 群聊** | 机器人被添加到 QQ 群中（需 @机器人） | `POST /v2/groups/:groupID/messages` |
| **消息列表单聊** | QQ 用户在消息列表中直接与机器人对话 | `POST /v2/users/:userID/messages` |

此外还有一个旧版私信方式：通过 `POST /users/@me/dms` 创建私信会话 + `POST /dms/:guildID/messages` 发送。

## 二、QQ 官方机器人 API 关键信息

### 基础信息

- **基础 URL**: `https://api.sgroup.qq.com`（沙箱: `https://sandbox.api.sgroup.qq.com`）
- **鉴权方式**: `Authorization: Bot ${appID}.${token}`
  - `appID`: 机器人 AppID，在 QQ 开放平台创建机器人后获取
  - `token`: 机器人 Token / Access Token
  - **注意**: Token 鉴权方式官方已标注为"已弃用"，推荐使用 Access Token，但当前实现使用的是 Token 方式
- **官方文档**: https://bot.q.qq.com/wiki/develop/api-v2/
- **开放平台**: https://q.qq.com/
- **NodeSDK**: `qq-guild-bot`（原 `@tencent-connect/bot-node-sdk` 已废弃更名）

### 三种场景的消息发送 API

#### 1. 子频道消息（频道场景）

```
POST /channels/:channelID/messages
Content-Type: application/json
Authorization: Bot ${appID}.${token}

{
  "content": "消息内容",
  "msg_type": 0,         // 0=文本, 2=markdown
  "msg_id": "xxx"        // 可选，回复某条消息
}
```

#### 2. 群聊消息（群聊场景）

```
POST /v2/groups/:groupID/messages
Content-Type: application/json
Authorization: Bot ${appID}.${token}

{
  "content": "消息内容",
  "msg_type": 0,         // 0=文本, 2=markdown
  "event_id": "xxx",     // 可选，要回复的事件 ID
  "msg_seq": 1           // 可选，消息序号，用于去重
}
```

#### 3. C2C 单聊消息（消息列表场景）

```
POST /v2/users/:userID/messages
Content-Type: application/json
Authorization: Bot ${appID}.${token}

{
  "content": "消息内容",
  "msg_type": 0,         // 0=文本, 2=markdown
  "event_id": "xxx",     // 可选，要回复的事件 ID
  "msg_seq": 1           // 可选，消息序号，用于去重
}
```

#### 4. 私信消息（旧版方式）

```
// 第一步：创建私信会话
POST /users/@me/dms
Authorization: Bot ${appID}.${token}

{ "recipient_id": "用户openid", "source_guild_id": "来源频道ID(可选)" }

// 返回 { "id": "guild_id" }

// 第二步：发送私信
POST /dms/:guildID/messages
Authorization: Bot ${appID}.${token}

{ "content": "消息内容", "msg_id": "xxx(可选)" }
```

### 消息类型

| msg_type 值 | 类型 | 说明 |
|-------------|------|------|
| 0 | TEXT | 纯文本 |
| 2 | MARKDOWN | Markdown 格式（子频道/群聊/C2C 支持，私信不支持） |

### 目标 ID 获取方式

| 场景 | 需要的 ID | 获取方式 |
|------|----------|---------|
| 群聊 | `group_openid` | QQ 开放平台管理后台查看已加入的群；或从 WebSocket 事件获取 |
| C2C 单聊 | `user_openid` | 用户先与机器人发起单聊，从 WebSocket 事件中的 `author.id` 获取 |
| 子频道 | `channel_id` | 在 QQ 频道客户端右键子频道 → 复制 ID |
| 私信 | `user_openid` | 同 C2C |

> **重要**: QQ 机器人使用 `openid` 而非 QQ 号，每个机器人看到的同一用户的 openid 不同（隐私保护）。

## 三、实现方案

### 设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| 推送模式 | 支持四种：群聊、C2C、子频道、私信 | 覆盖所有 QQ 机器人场景 |
| 配置方式 | 用户手动填写 AppID、Token、目标 ID | 用户可在 QQ 开放平台获取凭证 |
| Access Token 管理 | 暂未实现，当前使用 Token 方式 | 需确认 Access Token 获取接口 |
| 消息格式 | 文本为主，群/C2C/频道支持 markdown | 私信不支持 markdown，自动降级 |
| 代理支持 | 支持 HTTP/SOCKS 代理 | 国内访问 API 可能需要代理 |
| SDK 依赖 | 不使用任何 SDK，直接 HTTP 调用 | 零新增依赖，避免 SDK 废弃/不兼容问题 |

### 配置字段

```javascript
{
  appId:        { label: 'AppID',         type: 'text',     required: true  },
  token:        { label: 'AppSecret/Token', type: 'password', required: true  },
  msgType:      { label: '推送场景',      type: 'select',   required: true, options: ['group', 'c2c', 'channel', 'dms'] },
  targetId:     { label: '目标 ID',       type: 'text',     required: true  },
  sourceGuildId:{ label: '来源频道 ID',   type: 'text',     required: false },
  proxyUrl:     { label: '代理地址',      type: 'text',     required: false },
}
```

## 四、已实现的文件

### 新增文件

| 文件 | 说明 |
|------|------|
| `server/src/services/qqbot/qqbot-client.js` | QQ API 客户端，封装 Token 管理和四种消息发送 API |
| `server/src/services/channels/qqbot.channel.js` | 渠道适配器，支持四种推送场景 |

### 已修改文件

| 文件 | 修改内容 |
|------|---------|
| `server/src/services/channels/index.js` | 注册 `qqbot` 渠道 |
| `server/src/middleware/validator.middleware.js` | 白名单添加 `qqbot` |
| `web/src/views/channels/List.vue` | 渠道颜色 `bg-cyan-500`、图标 `MessageSquare`、描述文本 |

## 五、待完成事项

### 必须完成

- [ ] **确认 Access Token 获取方式**：官方推荐 Access Token 鉴权（Token 方式已弃用），需确认获取接口 URL 和请求参数
- [ ] **实际测试**：需要有一个已创建的 QQ 机器人才能实际测试推送
- [ ] **目标 ID 获取引导**：当前用户难以获取 `openid`，需要更友好的引导方式

### 建议优化

- [ ] **Access Token 自动管理**：实现获取 + 缓存 + 过期刷新机制（当前使用 Token 方式）
- [ ] **错误处理优化**：细化 QQ API 返回的错误码处理
- [ ] **消息长度限制**：QQ 对消息长度有上限，需要截断或分片
- [ ] **富媒体消息支持**：图片、文件等消息类型
- [ ] **前端引导页面**：详细的 ID 获取教程
- [ ] **子频道场景也支持 msg_type**：当前子频道消息未传递 msg_type 参数

## 六、暂停原因

1. 机器人尚未发布，无法拉进群或频道测试
2. 单聊/C2C 需要先获取 `user_openid`，但未运行 WebSocket 服务无法从事件中获取
3. Access Token 获取接口未确认，当前 Token 方式可能不稳定
4. 缺少测试环境，无法验证 API 调用是否正确

## 七、参考资源

- QQ 机器人官方文档: https://bot.q.qq.com/wiki/develop/api-v2/
- QQ 开放平台: https://q.qq.com/
- NodeSDK（qq-guild-bot）: https://github.com/tencent-connect/bot-node-sdk
- 群聊/C2C API PR: https://github.com/tencent-connect/bot-node-sdk/pull/93
- 群聊/C2C API 实现分支: https://github.com/WideLee/bot-node-sdk/tree/feat/botsdk
