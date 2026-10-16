---
title: Telegram 推送渠道配置指南
description: 通过 Telegram Bot 实现消息推送的完整配置教程
outline: deep
---

# Telegram 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **Telegram Bot** 推送渠道，实现向 Telegram 个人用户或群组发送文本、Markdown 和 HTML 消息。

## 概述

### 什么是 Telegram Bot 推送？

Telegram Bot 是 Telegram 官方提供的机器人平台，通过 BotFather 创建机器人后，可以主动向用户或群组发送消息。

| 特点 | 说明 |
|------|------|
| 推送目标 | Telegram 个人用户 / 群组 / 频道 |
| 鉴权方式 | Bot Token（HTTPS 请求） |
| 配置复杂度 | 低，仅需 Bot Token + Chat ID |
| 消息格式 | text、Markdown、HTML |
| 频率限制 | 无明确限制，但建议合理使用 |

### 前置条件

- 拥有 Telegram 账号
- 已部署并登录 MagicPush 管理后台
- （可选）需要代理才能访问 Telegram API（国内服务器通常需要）

---

## 第一步：创建 Telegram Bot 并获取配置信息

### 1.1 通过 BotFather 创建 Bot

1. 在 Telegram 中搜索 **`@BotFather`** 并打开对话
2. 发送 `/newbot` 命令
3. 按提示填写：
   - **Bot 的显示名称**（如 `MagicPush Bot`）
   - **Bot 的用户名**（必须以 `bot` 结尾，如 `magicpush_bot`）
4. 创建成功后，BotFather 会返回 **Bot Token**（形如 `123456789:ABCdefGHIJKlmNoPQRsTUVwxyZ`）

> 🔐 **重要**：Bot Token 是敏感凭证，请妥善保管，不要公开分享。

### 1.2 获取 Chat ID

#### 方法一：通过 Bot 获取个人 Chat ID

1. 在 Telegram 中搜索并打开你刚创建的 Bot
2. 点击 **「启动」** 或发送任意消息给 Bot
3. 在浏览器中访问以下地址（替换 `<YourBOTToken>`）：
   ```
   https://api.telegram.org/bot<YourBOTToken>/getUpdates
   ```
4. 在返回的 JSON 中，找到 `"chat":{"id":123456789}`，其中的数字就是你的 **Chat ID**

#### 方法二：通过 @userinfobot 获取

1. 在 Telegram 中搜索 **`@userinfobot`**
2. 发送任意消息，Bot 会返回你的数字 ID

#### 方法三：获取群组 Chat ID

1. 将你的 Bot 添加到群组中
2. 在群组中 @你的 Bot 并发送一条消息
3. 访问 `https://api.telegram.org/bot<YourBOTToken>/getUpdates`
4. 在返回的 JSON 中，`"chat":{"id":-xxxxxxxx}`，群组 ID 通常以 `-` 开头

至此，你已获得配置所需的信息：

| 配置项 | 示例值 | 来源 |
|--------|--------|------|
| Bot Token | `123456789:ABCdef...` | BotFather 创建成功后返回 |
| Chat ID | `123456789` 或 `-1001234567890` | 通过 getUpdates 或 @userinfobot 获取 |

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择 **「Telegram」**。

### 2.3 填写配置信息

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **Bot Token** | 从 BotFather 获取的 Bot Token | `123456789:ABCdefGHIJKlmNoPQRsTUVwxyZ` |
| **Chat ID** | 目标聊天 ID（用户 ID 或群组 ID） | `123456789` 或 `-1001234567890` |
| **代理地址**（可选） | 用于访问 Telegram API 的代理地址 | `http://127.0.0.1:7890` |

> 💡 **关于代理**：
> - 如果服务器在国内，通常无法直连 Telegram API，需要配置代理
> - 支持 `http://`、`https://`、`socks4://`、`socks5://` 协议
> - 如果服务器在境外，代理地址可以留空

填写完成后，给渠道起一个易于辨识的**名称**（如「Telegram 告警推送」），点击 **「保存」**。

### 2.4 测试连通性

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 Telegram 中收到「这是一条来自魔法推送的测试消息」，说明配置成功
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
    "type": "markdown"
  }'
```

支持的消息类型（`type` 参数）：

| type 值 | 说明 |
|---------|------|
| `text` | 纯文本消息（默认），使用 HTML 格式渲染 |
| `markdown` | Markdown 格式消息（使用 Telegram Markdown 格式） |
| `html` | HTML 格式消息（使用 Telegram HTML 格式） |

### 3.2 Markdown 消息示例

Telegram 支持以下 Markdown 语法（MarkdownV2 格式）：

```markdown
*粗体文本*
_斜体文本_
[链接文本](https://example.com)
`行内代码`
**粗体** 和 __粗体__
```

### 3.3 HTML 消息示例

Telegram 支持以下 HTML 标签：

```html
<b>粗体</b>
<i>斜体</i>
<a href="https://example.com">链接</a>
<code>行内代码</code>
<pre>代码块</pre>
```

### 3.4 特有消息类型

除了通用的 `text`、`markdown` 和 `html` 类型外，Telegram Bot 还支持以下**特有消息类型**，通过 `extraData` 参数发送：

::: tip 命名空间隔离
extraData 采用**命名空间隔离 + 类型自包含**设计，`channelType` 必须放在对应渠道的命名空间对象内：

```json
{
  "channelType": "photo",
  "extraData": {
    "telegram": {
      "url": "https://example.com/photo.png",
      "caption": "今日天气实况"
    }
  }
}
```

各渠道的命名空间 key：`wecom`（企业微信群机器人）、`wecomapp`（企业微信应用）、`telegram`、`feishu`、`qqbot`
:::

| 类型 | 说明 | 典型场景 |
|-------------|------|----------|
| `photo` | 图片消息（URL 或 Base64） | 发送图片、截图、验证码 |
| `document` | 文件消息（URL 或 Base64） | 发送文件、PDF、压缩包 |
| `location` | 位置消息（经纬度） | 分享地理位置、定位打卡 |

::: tip 使用方式
特有消息类型需要在 API 请求中通过 `extraData[namespace].channelType` 指定类型，同时在同一命名空间内携带该类型的结构化数据。Telegram 的图片和文件支持直接传入 URL 或 Base64 编码。
:::

#### photo 图片消息

支持两种方式：通过 URL 发送或 Base64 编码发送：

```bash
# 方式一：使用 URL
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "今日天气实况",
    "content": "请查看今日天气截图",
    "type": "text",
    "extraData": {
      "telegram": {
        "channelType": "photo",
        "url": "https://picsum.photos/600/400",
        "caption": "今日天气实况"
      }
    }
  }'

# 方式二：使用 Base64 编码
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "服务器截图",
    "content": "服务器 CPU 使用率超过 90%，请查看截图",
    "type": "text",
    "extraData": {
      "telegram": {
        "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
        "filename": "screenshot.jpg",
        "caption": "*服务器截图*",
        "parse_mode": "Markdown"
      }
    }
  }'
```

**extraData 字段说明**（url 和 base64 二选一）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | String | 条件必填 | 图片的直接访问 URL（与 base64 二选一） |
| base64 | String | 条件必填 | 图片 Base64 编码字符串（与 url 二选一） |
| filename | String | 否 | 文件名（默认 `photo.jpg`，base64 方式时可用） |
| caption | String | 否 | 图片下方的说明文字 |
| parse_mode | String | 否 | 说明文字格式：`Markdown` / `HTML` / 留空为纯文本 |

#### document 文件消息

支持通过 URL 或 Base64 编码发送任意格式文件：

```bash
# 方式一：使用 URL
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "2024年第一季度报告",
    "content": "请查收2024年第一季度报告",
    "type": "text",
    "extraData": {
      "telegram": {
        "channelType": "document",
        "url": "https://example.com/report.pdf",
        "caption": "2024年第一季度报告"
      }
    }
  }'

# 方式二：使用 Base64 编码
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "月度报告",
    "content": "请查收月度报告文件",
    "type": "text",
    "extraData": {
      "telegram": {
        "base64": "JVBERi0xLjQK...",
        "filename": "report.pdf",
        "caption": "月度报告"
      }
    }
  }'
```

**extraData 字段说明**（url 和 base64 二选一）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | String | 条件必填 | 文件的直接访问 URL（与 base64 二选一） |
| base64 | String | 条件必填 | 文件 Base64 编码字符串（与 url 二选一） |
| filename | String | 否 | 文件名（默认 `file.pdf`，base64 方式时可用） |
| caption | String | 否 | 文件下方的说明文字 |

#### location 位置消息

发送地理坐标位置信息：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "天安门广场位置",
    "content": "北京市东城区长安街天安门广场",
    "type": "text",
    "extraData": {
      "telegram": {
        "channelType": "location",
        "latitude": 39.9042,
        "longitude": 116.4074,
        "title": "天安门广场",
        "address": "北京市东城区长安街"
      }
    }
  }'
```

**extraData 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| latitude | Number | 是 | 纬度坐标（如北京：39.9042） |
| longitude | Number | 是 | 经度坐标（如北京：116.4074） |
| title | String | 否 | 显示在位置上方的地点名称（最长 256 字符） |
| address | String | 否 | 详细地址信息 |


---

## 技术细节

### 消息长度限制

- 文本消息：最长不超过 **4096 字符**
- 超过限制的消息会被自动截断

### 代理支持

MagicPush 自动处理代理配置：

1. 在渠道配置中填写 `proxyUrl`（如 `http://127.0.0.1:7890`）
2. MagicPush 会自动创建对应的代理 Agent
3. 所有发往 Telegram API 的请求都会经过代理

### Parse Mode

根据 `type` 参数，MagicPush 自动设置 `parse_mode`：

| type | parse_mode |
|------|------------|
| `text` | `HTML` |
| `markdown` | `Markdown` |
| `html` | `HTML` |

---

## 常见问题

### Q: 发送消息返回 `401 Unauthorized` 错误？

**原因**：Bot Token 填写错误。

**解决**：
1. 检查 Bot Token 是否完整复制，没有多余空格或换行
2. 确认 Token 格式正确（数字 + `:` + 字母数字组合）
3. 在浏览器中访问 `https://api.telegram.org/bot<YourBOTToken>/getMe` 验证 Token 是否有效

### Q: 发送消息返回 `400 Bad Request: chat not found` 错误？

**原因**：Chat ID 不正确，或用户尚未与 Bot 开始对话。

**解决**：
1. 确认 Chat ID 正确（个人用户 ID 是正数，群组 ID 通常以 `-` 或 `-100` 开头）
2. 用户需要先主动发送一条消息给 Bot，Bot 才能主动推送
3. 对于群组，需要确保 Bot 是群成员，且有权限发送消息

### Q: 测试消息显示发送成功，但 Telegram 中收不到？

**原因**：可能是代理配置问题，或 Bot 被用户屏蔽。

**解决**：
1. 检查代理地址是否正确，服务器能否访问 `api.telegram.org`
2. 确认用户没有屏蔽 Bot
3. 在 BotFather 中检查 Bot 是否被禁用

### Q: 国内服务器如何配置代理？

**解决**：
1. 在服务器上运行代理软件（如 Clash、V2Ray 等）
2. 在 MagicPush 渠道配置中填写代理地址（如 `http://127.0.0.1:7890`）
3. 确保代理软件允许局域网连接（如果需要）

### Q: 如何发送到群组？

**解决**：
1. 将 Bot 添加到群组中
2. 在群组中 @Bot 并发送一条消息
3. 通过 `getUpdates` 接口获取群组 ID（通常以 `-100` 开头）
4. 将群组 ID 填写到 MagicPush 的 `Chat ID` 字段

### Q: Markdown 消息格式没有正确渲染？

**原因**：Telegram 的 Markdown 是特定子集，不支持所有 Markdown 语法。

**解决**：
1. 参考 [Telegram Bot API 文档](https://core.telegram.org/bots/api#markdownv2-style) 了解支持的格式
2. 特殊字符需要转义（`_`、`*`、`[`、`]`、`(`、`)`、`~`、``` ` ``、`>`、`#`、`+`、`-`、`=`、`|`、`{`、`}`、`.`、`!`）
3. 可以尝试使用 `html` 类型代替 `markdown`

---

## 参考资源

- [Telegram Bot API 官方文档](https://core.telegram.org/bots/api)
- [BotFather](https://t.me/BotFather)
- [Telegram Bot 创建指南](https://core.telegram.org/bots#6-botfather)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
