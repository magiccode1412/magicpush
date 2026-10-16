---
title: QQ 机器人推送渠道配置指南
description: 通过 QQ 官方机器人实现群聊/单聊消息推送的完整配置教程
outline: deep
---

# QQ 机器人推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **QQ 机器人** 推送渠道，实现向 QQ 群聊或单聊发送消息。

## 概述

### 什么是 QQ 机器人推送？

通过 QQ 开放平台的**官方机器人**能力，可以向 QQ 群聊或用户消息列表发送文本和 Markdown 格式的消息。

| 特点 | 说明 |
|------|------|
| 推送目标 | QQ 群聊 / 单聊消息列表 |
| 鉴权方式 | **AppSecret 自动换取 Access Token**（官方推荐） |
| 配置复杂度 | 中，需要创建 QQ 机器人并获取凭证 |
| 消息格式 | **text（纯文本）、markdown、media（富媒体：图片/视频/语音/文件）** |
| 频率限制 | [点此查看](#频率限制) |

### 推送场景对比

QQ 机器人目前支持两种推送模式：

| 模式 | 说明 | API 端点 |
|------|------|---------|
| **群聊消息** (`group`) | 发送到指定 QQ 群 | `POST /v2/groups/{group_id}/messages` | 
| **单聊消息** (`c2c`) | 发送到用户消息列表 | `POST /v2/users/{user_id}/messages` |

> 💡 **提示**：两种模式均为官方标准 v2 API，均支持纯文本和 Markdown 格式。

### 前置条件

- 拥有 QQ 账号
- 已在 [QQ 开放平台](https://q.qq.com/) 创建机器人
- 已获取机器人的 **AppID** 和 **AppSecret**
- 已部署并登录 MagicPush 管理后台
- （可选）如果服务器在国外，可能需要代理才能访问国内 QQ API

---

## 第一步：在 QQ 开放平台创建机器人并获取配置信息

### 1.1 创建 QQ 机器人

1. 访问 [QQ 开放平台](https://q.qq.com/)（注意是 `q.qq.com`）
2. 注册/登录账号（支持企业或个人主体）
3. 点击 **「创建机器人」**
4. 填写机器人信息：
   - **机器人名称**：如 `MagicPush 通知`
   - **机器人简介**：可选
5. 创建成功后，进入机器人详情页

### 1.2 获取 AppID 和 AppSecret

在机器人详情页，可以找到：

| 配置项 | 说明 | 示例值 | 来源 |
|--------|------|--------|------|
| AppID | 机器人应用 ID | `1234567890` | 机器人详情页 |
| AppSecret | 应用密钥（用于自动获取 Access Token） | `xxxxxxxxxxxxxxxx` | 机器人详情页 → 「凭证」或「开发设置」 |

> 🔐 **重要**：AppSecret 是敏感凭证，请妥善保管，不要公开分享。
>
> 💡 **关于 Access Token**：MagicPush 会自动使用你的 AppSecret 向 QQ 官方接口获取 Access Token，无需手动操作！系统会自动管理 Token 的获取、缓存和刷新（提前 5 分钟刷新避免失效）。

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择 **「QQ机器人」**。

### 2.3 填写配置信息

根据第一步获取的信息，填写以下配置字段：

| 字段 | 是否必填 | 说明 | 示例 |
|------|---------|------|------|
| **AppID** | ✅ 是 | QQ 开放平台机器人的 AppID | `1234567890` |
| **AppSecret（应用密钥）** | ✅ 是 | 用于自动获取 Access Token | `xxxxxxxxxxxxxxxx` |
| **推送场景** | ✅ 是 | 群聊消息 / 单聊消息 | `group` |
| **代理地址** | ❌ 否 | 用于访问 QQ API 的代理地址 | `http://127.0.0.1:7890` |

> 💡 **推送场景选择建议**：
> - **群聊消息**（`group`）：推送到 QQ 群，适合团队通知、告警等场景
> - **单聊消息**（`c2c`）：推送到用户消息列表，适合个人通知、提醒等场景
>
> 💡 **关于代理**：
> - 如果服务器在**国内**，通常可以直接访问 QQ API，**不需要**配置代理
> - 如果服务器在**国外/境外**（如 AWS、Vultr 等），可能需要配置代理才能访问国内 QQ API
> - 支持 `http://`、`https://`、`socks4://`、`socks5://` 协议

填写完成后，给渠道起一个易于辨识的**名称**（如「QQ 群告警推送」），点击 **「保存」**。

### 2.4 绑定目标（自动获取 targetId）

保存渠道后，你需要通过 **WebSocket 绑定** 来自动获取目标 ID：

1. 在渠道卡片右侧下拉菜单中，点击 **「开始绑定」**
2. 根据页面提示操作：
   - **群聊模式**：在目标 QQ 群中 @机器人 发送任意消息
   - **单聊模式**：给机器人发送一条私聊消息
3. MagicPush 会通过 WebSocket 自动识别并提取目标 ID
4. 绑定成功后，targetId 会自动填充到渠道配置中

> 💡 **优势**：无需手动复制粘贴 OpenID，系统自动完成绑定！

### 2.5 测试连通性

渠道绑定成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 QQ 中收到测试消息，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查

---

## 第三步：使用推送

### 3.1 通过 API 推送

创建渠道后，可以通过 MagicPush 的标准 API 进行推送：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统告警",
    "content": "服务器 CPU 使用率超过 90%，请及时处理",
    "type": "text"
  }'
```

支持的消息类型（`type` 参数）：

| type 值 | 说明 | 适用场景 |
|---------|------|---------|
| `text` | 纯文本消息（默认） | 所有场景 |
| `markdown` | Markdown 格式消息 | **群聊/单聊均支持** ✅ |
| `html` | HTML 格式消息（MagicPush 自动剥离标签转为纯文本） | 所有场景 |

> ✅ **重要**：群聊和单聊模式都完整支持 Markdown 格式！MagicPush 会自动将 Markdown 内容转换为符合 QQ 官方规范的格式（使用 `markdown` 对象包裹 + `msg_type: 2`）。

### 3.2 Markdown 消息示例

QQ 机器人的群聊和单聊模式支持以下标准 Markdown 语法的**子集**：

#### 支持的语法

```markdown
# 一级标题
## 二级标题

**加粗文字**
*斜体文字*
~~删除线~~
***加粗斜体***

[超链接文本](https://example.com)
<https://自动链接>

![图片描述 #宽度 #高度](https://example.com/image.png)

1. 有序列表第一项
2. 有序列表第二项

- 无序列表第一项
- 无序列表第二项

> 引用文本

---
```

#### 实际使用示例

```json
{
  "title": "🚨 服务器告警",
  "content": "**告警级别**：⚠️ 高\n\n> 服务器：192.168.1.100\n> CPU使用率：95%\n> 时间：2024-06-01 14:00\n\n请立即处理！\n\n- [查看详情](https://monitoring.example.com)",
  "type": "markdown"
}
```

#### 语法限制说明

| 功能类别 | 支持？ | 注意事项 |
|---------|-------|---------|
| 标题（一级/二级） | ✅ 支持 | 只支持 `#` 和 `##` |
| 文字样式 | ✅ 支持 | 加粗、斜体、删除线、组合样式 |
| 超链接 | ✅ 支持 | 必须是公网可访问的URL |
| 图片 | ✅ 支持 | **必须使用公网可访问的 URL**，不支持本地路径 |
| 列表 | ✅ 支持 | 有序/无序列表可相互嵌套，但**不建议无限制嵌套** |
| 引用 | ✅ 支持 | `>` 引用块 |
| 分割线 | ✅ 支持 | `---` 或 `***` |
| 代码块 | ✅ 支持 |  |
| 表格 | ✅ 支持 |  |
| HTML标签 | ❌ 不支持 | 部分支持（不建议使用） |

> ⚠️ **注意**：
> - 图片资源必须是**公网可访问的 URL**，QQ 后台会下载并转存
> - 列表前如果是普通文本，必须用**空行隔开**才能正确识别
> - 建议单条 Markdown 消息不超过 **4000 字符**（虽然上限5000）

### 3.3 富媒体消息示例

QQ 机器人支持发送**富媒体消息**：图片、视频、语音和通用文件。这是通过特有消息类型 `media` 实现的。

::: tip 命名空间隔离
extraData 采用**命名空间隔离 + 类型自包含**设计，所有特有类型的字段必须放在以渠道标识符为 key 的对象内：

```json
{
  "qqbot": {
  "extraData": {
    "qqbot": {
      "channelType": "media",
      "file_type": 1,
      "url": "https://example.com/image.png"
    }
  }
}
```

各渠道的命名空间 key：`wecom`（企业微信群机器人）、`wecomapp`（企业微信应用）、`telegram`、`feishu`、`qqbot`
:::

#### 支持的媒体类型

| file_type | 媒体类型 | 支持格式 | QQ场景 |
|-----------|---------|---------|--------|
| `1` | 图片 | png, jpg | 群聊 + 单聊 ✅ |
| `2` | 视频 | mp4 | 群聊 + 单聊 ✅ |
| `3` | 语音 | silk, wav, mp3, flac | 群聊 + 单聊 ✅ |
| `4` | 文件 | 通用文件格式 | 群聊 + 单聊 ✅ |

#### 发送流程

富媒体消息采用**两步发送**模式：

```
Step 1: 上传媒体资源 → 获取 file_info
         POST /v2/groups/{id}/files 或 /v2/users/{id}/files
         Body: { file_type, url 或 file_data }
         ← 返回: { file_info, ttl }

Step 2: 使用 file_info 发送消息
         POST /v2/groups/{id}/messages 或 /v2/users/{id}/messages
         Body: { msg_type: 7, media: { file_info } }
```

> 💡 **优势**：MagicPush 会自动管理整个流程，包括：
> - 自动选择上传端点（群/单聊）
> - file_info 内存缓存（避免重复上传同一资源）
> - TTL 过期自动清理
> - 错误码翻译为友好提示

#### API 调用示例

##### 示例 1: 通过 URL 发送图片（推荐）

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "",
    "content": "",
    "extraData": {
      "qqbot": {
        "file_type": 1,
        "url": "https://example.com/image.png"
      }
    }
  }'
```

##### 示例 2: 通过 Base64 发送语音

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "",
    "content": "",
    "extraData": {
      "qqbot": {
        "file_type": 3,
        "file_data": "<Base64编码的silk/wav/mp3音频数据>"
      }
    }
  }'
```

#### extraData 字段说明

| 字段名 | 类型 | 是否必填 | 说明 |
|--------|------|---------|------|
| `file_type` | number | ✅ 是 | 媒体类型：1(图片) / 2(视频) / 3(语音) / 4(文件) |
| `url` | string | ❌ 否（二选一） | 媒体资源的公网可访问URL（推荐使用） |
| `file_data` | string | ❌ 否（二选一） | 文件的Base64编码内容（无URL时使用） |

#### 注意事项

- **URL 模式优先推荐**：性能更好，且支持 file_info 缓存复用
- **Base64 模式注意**：大文件会导致请求体过大，建议仅在无法提供 URL 时使用
- **file_info 隔离性**：通过群端点上传的 file_info 只能用于群聊，单聊同理
- **TTL 有效期**：系统会自动缓存 file_info 并监控过期时间

---

## 技术细节

### API 请求格式

MagicPush 内部会根据消息类型构造不同的请求体发送给 QQ API：

#### 纯文本消息（`type: "text"`）

```javascript
// 发送给 QQ API 的请求体
{
  content: "这是纯文本消息"
}
```

#### Markdown 消息（`type: "markdown"`）

```javascript
// 发送给 QQ API 的请求体（官方规范格式）
{
  msg_type: 2,
  markdown: {
    content: "# 标题\n\n**加粗文字**..."
  }
}
```

> 🔧 **技术细节**：QQ 官方的 Markdown 消息必须同时满足两个条件：
> 1. 设置 `msg_type: 2`
> 2. 使用 `markdown: { content: "..." }` 对象包裹内容
>
> MagicPush 已自动处理这些细节，你只需要正常传入 Markdown 内容即可！

#### 富媒体消息（`channelType: "media"` / `extraData`）

**Step 1 - 上传请求体**：

```javascript
// POST /v2/groups/{group_openid}/files (群聊)
// POST /v2/users/{user_openid}/files   (单聊)
{
  file_type: 1,              // 1=图片 | 2=视频 | 3=语音 | 4=文件
  url: "https://example.com/photo.jpg",  // 或使用 file_data
}
```

**Step 1 - 上传成功响应**：

```javascript
{
  file_uuid: "a1b2c3d4...",
  file_info: "加密的文件信息字符串...",  // ★ 核心！后续发送需要
  ttl: 86400                 // 有效期秒数（0=永久有效）
}
```

**Step 2 - 发送富媒体消息请求体**：

```javascript
// POST /v2/groups/{group_openid}/messages (群聊)
// POST /v2/users/{user_openid}/messages   (单聊)
{
  msg_type: 7,               // 富媒体消息类型标识
  msg_seq: 1,                // 消息序号（去重用）
  media: {
    file_info: "从 Step 1 返回的 file_info 字符串"
  }
}
```

> 🔧 **技术细节**：
> - `file_info` 是不透明字符串，我们只需原样透传到 `media.file_info`
> - MagicPush 自动管理两步流程、缓存和过期清理
> - 群/单聊的上传端点不同，系统会根据渠道配置的 `msgType` 自动选择

### 消息长度限制

| 消息类型 | 最大长度 | 处理方式 |
|---------|---------|---------|
| 纯文本 | **5000 字符** | 超出会自动截断并警告 |
| Markdown | 建议 **4000 字符以内** | 上限也是5000字符，超出会截断 |

### 频率限制

QQ 开放平台对机器人发送消息有严格的频率控制（QPM = 每分钟请求数）：

#### 整体频控规则

| 机器人账号类型 | 限频（QPM） | 说明 |
|---------------|------------|------|
| **企业认证开发者** | **60 QPM** | 每分钟最多发送 60 条消息 |
| **个人认证开发者** | **60 QPM** | 同上 |
| **未认证** | **30 QPM** | 每分钟最多发送 30 条消息 |

#### 单群维度频控

| 限制维度 | 限频（QPM） | 说明 |
|---------|------------|------|
| **单群（机器人发给某个群）** | **20 QPM** | 机器人向同一个 QQ 群每分钟最多发 20 条 |

> ⚠️ **重要说明**：
> - 以上限制为**主动消息**（机器人主动推送）的限制
> - 若超频调用接口，平台会返回**超频错误信息**
> - 频控是针对**单个机器人账号**的维度统计
> - 单群限制意味着：即使你的机器人总 QPM 未超标，向同一个群发太多也会被限频

#### 实际使用建议

1. **监控告警场景**：如果告警频率很高（如每秒多次），建议：
   - 使用**消息合并/聚合**策略，将多条告警合并为一条
   - 设置合理的**告警冷却时间**（如30秒内不重复发送同类告警）
   
2. **多渠道共享同一机器人**：
   - 如果你有多个 MagicPush 渠道使用同一个 AppID
   - 所有渠道的消息都会计入同一个机器人的总 QPM
   - 注意合理分配各渠道的消息量

3. **被动回复不受此限制**：
   - 用户 @机器人 后的自动回复（60分钟内有效窗口期）有单独的配额
   - 具体请参考 [QQ 官方文档](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/send-receive/send.html)

### 代理支持

> 🌍 **说明**：QQ API 服务器位于国内（`api.sgroup.qq.com`、`bots.qq.com`），因此：
> - **国内服务器**：可以直接访问，**不需要**代理
> - **国外/境外服务器**：可能需要通过代理访问国内 QQ API

MagicPush 自动处理代理配置：

1. 在渠道配置中填写 `proxyUrl`（如 `http://127.0.0.1:7890`）
2. MagicPush 会自动创建对应的代理 Agent
3. 所有发往 QQ API 的请求都会经过代理

### 鉴权方式

MagicPush 使用官方推荐的 **Access Token** 鉴权方式：

1. 用户配置 **AppID** 和 **AppSecret**
2. 系统自动向 `https://bots.qq.com/app/getAppAccessToken` 获取 Access Token
3. Access Token 全局缓存（有效期 2 小时，提前 5 分钟刷新）
4. 所有 API 请求使用 `Authorization: QQBot ${accessToken}` 格式

> ✅ **优势**：无需手动管理 Token 的获取和刷新，系统全自动处理！同一 AppID 的多个渠道共享同一个 Token 缓存。

---

## 常见问题

### Q: 测试消息显示发送成功，但 QQ 中收不到？

**原因**：可能是代理配置问题，或机器人被用户屏蔽。

**解决**：
1. 检查代理地址是否正确，服务器能否访问 QQ API
2. 确认用户没有屏蔽机器人
3. 在 QQ 开放平台中检查机器人是否被禁用
4. 检查群聊模式下机器人是否有发言权限

### Q: 国外服务器如何配置代理访问 QQ API？

**背景**：QQ API 服务器在国内，国外服务器（如 AWS、Vultr、DigitalOcean 等）可能无法直接访问。

**解决**：
1. 在服务器上运行代理软件（确保能访问国内网络，或使用国内的中转服务）
2. 在 MagicPush 渠道配置中填写代理地址（如 `http://127.0.0.1:7890`）
3. 确保代理软件允许局域网连接（如果需要）

> 💡 **提示**：如果你的服务器在国内（如阿里云、腾讯云），通常不需要配置代理。

### Q: 如何发送到多个群？

**解决**：
1. 将机器人添加到多个 QQ 群
2. 为每个群创建一个 MagicPush 渠道（每个群对应一个不同的 group_openid）
3. 每个渠道独立配置和管理

### Q: 群聊模式和单聊模式有什么区别？

| 对比项 | 群聊消息 (`group`) | 单聊消息 (`c2c`) |
|--------|-------------------|------------------|
| **API 端点** | `/v2/groups/{group_id}/messages` | `/v2/users/{user_id}/messages` |
| **目标对象** | 整个群的成员可见 | 仅对特定用户可见 |
| **适用场景** | 团队通知、监控告警、公告 | 个人提醒、私人通知 |
| **频率限制** | 主动消息每月4条（默认）；被动回复60分钟内有效 | 主动消息每月4条；被动回复60分钟内有效 |

---

## 参考资源

- [QQ 开放平台](https://q.qq.com/)
- [QQ 机器人官方文档](https://bot.q.qq.com/wiki/)
- [QQ 机器人消息发送 API (v2)](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/send-receive/send.html)
- [QQ 机器人 Markdown 消息文档](https://bot.qq.com/wiki/develop/api-v2/server-inter/message/type/markdown.html)
- [QQ 机器人富媒体消息文档](https://bot.qq.com/wiki/develop/api-v2/server-inter/message/type/media.html)
- [QQ 机器人富媒体上传 API](https://bot.qq.com/wiki/develop/api-v2/server-inter/message/send-receive/rich-media.html)
- [QQ 机器人错误码参考](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/error-trace/openapi.html)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
