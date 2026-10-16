---
title: Webhook 推送渠道配置指南
description: 通过自定义 Webhook 实现通用 HTTP 推送的完整配置教程
outline: deep
---

# Webhook 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **Webhook** 推送渠道，实现向任意支持 HTTP 的服务推送消息。

## 概述

### 什么是 Webhook 推送？

Webhook 是一种通用的 HTTP 回调机制。MagicPush 的 Webhook 渠道允许你配置任意 HTTP 端点，将消息以自定义格式推送到第三方系统（如 Slack、Discord、自研系统、IFTTT 等）。

| 特点 | 说明 |
|------|------|
| 推送目标 | 任意支持 HTTP 的服务 |
| 鉴权方式 | 自定义 Headers（如 Authorization、X-API-Key 等） |
| 配置复杂度 | 中，需要了解目标服务的 API 格式 |
| 消息格式 | 自定义（JSON 模板 + 变量替换） |
| 频率限制 | 取决于目标服务 |

### 前置条件

- 已部署并登录 MagicPush 管理后台
- 已有目标 Webhook 地址（如 Slack Webhook、Discord Webhook 等）

---

## 第一步：准备 Webhook 地址

### 1.1 常见 Webhook 服务获取方式

#### Slack Webhook

1. 打开 [Slack API](https://api.slack.com/messaging/webhooks)
2. 点击 **「Create an app」**
3. 选择 **「Incoming Webhooks」**
4. 开启 **「Activate Incoming Webhooks」**
5. 点击 **「Add New Webhook to Workspace」**
6. 选择频道后，获得 Webhook URL

#### Discord Webhook

1. 打开 Discord 服务器设置
2. 选择 **「整合」** → **「Webhooks」**
3. 点击 **「新建 Webhook」**
4. 设置名称和频道，点击 **「复制 Webhook URL」**

#### 自研系统

如果你的系统需要接收推送，需要提供一个 HTTP 接口：

- **支持的方法**：GET、POST、PUT、PATCH
- **推荐格式**：POST + JSON Body
- **需要返回**：JSON 格式响应

示例接口（Node.js）：

```javascript
app.post('/webhook', (req, res) => {
  const { title, content, type, timestamp } = req.body;
  console.log(`[告警] ${title}: ${content}`);
  res.json({ success: true });
});
```

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择 **「Webhook」**。

### 2.3 填写配置信息

| 字段 | 说明 | 示例 |
|------|------|------|
| **Webhook URL** | 接收推送的 HTTP 地址 | `https://hooks.slack.com/services/...` |
| **HTTP 方法** | 请求方法 | `POST`（推荐）、`GET`、`PUT`、`PATCH` |
| **自定义 Headers**（可选） | JSON 格式，支持模板变量 | `{"Authorization": "Bearer token123"}` |
| **Body 模板**（可选） | 请求体模板，支持变量替换 | `{"text": "{{title}}: {{content}}"}` |

#### Headers 配置说明

如果目标服务需要鉴权，在 **自定义 Headers** 中填写 JSON：

```json
{
  "Authorization": "Bearer your-token-here",
  "X-Custom-Header": "custom-value"
}
```

#### Body 模板配置说明

MagicPush 支持在 Body 模板中使用变量：

| 变量 | 说明 | 示例值 |
|--------|------|--------|
| `{{title}}` | 消息标题 | `服务器告警` |
| `{{content}}` | 消息内容 | `CPU 使用率超过 90%` |
| `{{type}}` | 消息类型 | `text`、`markdown`、`html` |
| `{{timestamp}}` | ISO 时间戳 | `2024-06-01T14:00:00.000Z` |

**示例 1**：简单 JSON 格式（推荐）

```
{"text": "{{title}}: {{content}}"}
```

**示例 2**：Slack 兼容格式

```
{"text": "*{{title}}*\n{{content}}"}
```

**示例 3**：Discord 兼容格式

```
{"content": "**{{title}}**\n{{content}}"}
```

**示例 4**：复杂 JSON 格式

```
{
  "msgtype": "text",
  "text": {
    "content": "{{title}}\n\n{{content}}"
  }
}
```

> 💡 **提示**：如果留空 Body 模板，MagicPush 会使用默认 JSON 格式：
> ```json
> {"title": "...", "content": "...", "type": "...", "timestamp": "..."}
> ```

填写完成后，给渠道起一个易于辨识的**名称**（如「Slack 告警推送」），点击 **「保存」**。

### 2.4 测试连通性

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果目标服务收到测试消息，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查

---

## 第三步：使用推送

### 3.1 通过 API 推送

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "服务器告警",
    "content": "CPU 使用率超过 90%，请及时处理",
    "type": "text"
  }'
```

### 3.2 模板变量使用示例

发送以下请求：

```json
{
  "title": "服务异常",
  "content": "API 响应时间超时",
  "type": "text"
}
```

如果 Body 模板配置为：

```
{"text": "*{{title}}*\n{{content}}\n时间：{{timestamp}}"}
```

实际发送的请求体为：

```json
{
  "text": "*服务异常*\nAPI 响应时间超时\n时间：2024-06-01T14:00:00.000Z"
}
```

---

## 技术细节

### 变量替换规则

- 变量格式：`{{变量名}}`（前后各两个大括号）
- 变量名与消息对象的字段对应（`title`、`content`、`type`、`timestamp`）
- 如果变量在消息中不存在，替换为空字符串
- JSON 中的特殊字符会自动转义（引号、换行等）

### HTTP 方法与数据流

| 方法 | Body 处理 |
|------|------------|
| GET | Body 模板参数会作为 URL 查询参数发送 |
| POST、PUT、PATCH | Body 模板作为请求体发送（JSON 格式） |

### 超时设置

- Webhook 请求超时时间：**30 秒**
- 如果目标服务响应超时，会返回错误

### 响应处理

MagicPush 会记录目标服务的响应：

- 成功：返回 `success: true` 及响应状态码
- 失败：抛出错误，包含响应状态码和错误信息

---

## 常见问题

### Q: 发送失败，提示「无效的 URL 格式」？

**原因**：Webhook URL 格式不正确。

**解决**：
1. 确保 URL 以 `http://` 或 `https://` 开头
2. 检查是否有多余空格或换行
3. 确认 URL 中的特殊字符已正确编码

### Q: 目标服务返回 401/403 错误？

**原因**：鉴权失败，Headers 配置不正确。

**解决**：
1. 检查 **自定义 Headers** 中的 Authorization 格式
2. Bearer Token 格式：`{"Authorization": "Bearer your-token"}`
3. Basic Auth 格式：`{"Authorization": "Basic base64(user:pass)"}`
4. 确认 Token 没有过期

### Q: 目标服务返回 400 错误？

**原因**：请求体格式不符合目标服务的要求。

**解决**：
1. 检查 **Body 模板** 的 JSON 格式是否正确（可以在 [JSON 校验工具](https://jsonlint.com/) 中验证）
2. 确认目标服务期望的字段名（如 Slack 使用 `text`，Discord 也使用 `content`）
3. 可以先留空 Body 模板，使用默认格式测试连通性

### Q: 模板变量没有正确替换？

**原因**：变量名格式不正确，或变量在消息中不存在。

**解决**：
1. 确认变量格式为 `{{title}}`（两个大括号）
2. 确认变量名拼写正确（`title`、`content`、`type`、`timestamp`）
3. 如果消息中没有 `title`，`{{title}}` 会被替换为空字符串

### Q: 如何向同一个 Webhook 发送不同类型的消息？

**解决**：
1. 在 API 调用时指定 `type` 参数（`text`、`markdown`、`html`）
2. 在 Body 模板中通过 `{{type}}` 变量获取消息类型
3. 根据类型在目标服务中做不同处理

### Q: 可以在 Headers 中使用模板变量吗？

**回答**：可以。Headers 的值也支持模板变量替换：

```json
{
  "X-Timestamp": "{{timestamp}}",
  "X-Message-Type": "{{type}}"
}
```

---

## 参考资源

- [Webhook 是什么？](https://en.wikipedia.org/wiki/Webhook)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Discord Webhooks](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
