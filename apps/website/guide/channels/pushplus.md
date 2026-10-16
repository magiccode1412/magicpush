---
title: PushPlus 推送渠道配置指南
description: 通过 PushPlus 服务实现微信推送的完整配置教程
outline: deep
---

# PushPlus 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **PushPlus** 推送渠道，实现向微信推送消息通知。

## 概述

### 什么是 PushPlus？

PushPlus 是一个消息推送服务平台，可以将消息推送到微信公众号、短信、邮件等多个渠道。其中最常用的是**微信公众号推送**（在微信中接收消息通知）。

| 特点 | 说明 |
|------|------|
| 推送目标 | 微信公众号（微信接收）、短信、邮件 |
| 鉴权方式 | Token（在 PushPlus 官网获取） |
| 配置复杂度 | 低，仅需粘贴 Token |
| 消息格式 | text（纯文本）、markdown、html |
| 频率限制 | 免费版 200 条/天，付费版更高 |

### 前置条件

- 拥有微信号（用于接收推送）
- 已注册 [PushPlus 官网](https://www.pushplus.plus/) 账号
- 已部署并登录 MagicPush 管理后台

---

## 第一步：在 PushPlus 官网获取 Token

### 1.1 注册并登录 PushPlus

1. 访问 [PushPlus 官网](https://www.pushplus.plus/)
2. 点击右上角 **「登录」**
3. 使用**微信扫码** 登录（推荐）或注册账号

### 1.2 获取 Token（令牌）

1. 登录后，点击右上角 **「控制台」**
2. 在控制台首页，可以看到 **「Token（令牌）」**
3. 点击 **「复制」** 按钮，复制 Token 值

> 📌 **Token 示例**：`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

> 🔐 **重要**：Token 是敏感凭证，请妥善保管，不要公开分享。

### 1.3（可选）创建群组编码

如果你需要向多人推送消息（群组推送）：

1. 在控制台中，点击左侧 **「群组管理」**
2. 点击 **「创建群组」**
3. 填写群组名称，点击 **「创建」**
4. 将群组编码（Topic）分享给其他用户，他们关注后即可接收群组消息
5. 记录 **群组编码**（如 `xxxxxx`）

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型$

在弹出的对话框中，从渠道类型下拉列表中选择 **「PushPlus」**。

### 2.3 填写配置信息

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **Token** | PushPlus 令牌（从控制台复制） | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| **Topic（可选）** | 群组编码，用于群推消息 | `xxxxxx` |

> 💡 **Topic 说明**：
> - 留空：消息只推送到你自己的微信
> - 填写群组编码：消息推送到群组所有成员
> - 需要先让其他用户关注你的群组，他们才能收到消息

填写完成后，给渠道起一个易于辨识的**名称**（如「PushPlus 微信通知」），点击 **「保存」**。

### 2.4 测试连通性

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果微信收到「这是一条来自魔法推送的测试消息」，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查

> 💡 **提示**：微信接收消息可能有 1-2 分钟延迟，请耐心等待。

---

## 第三步：使用推送

### 3.1 通过 API 推送

创建渠道后，可以通过 MagicPush 的标准 API 进行推送：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "服务器告警",
    "content": "CPU 使用率超过 90%，请及时处理",
    "type": "markdown"
  }'
```

支持的消息类型（`type` 参数）：

| type 值 | 说明 |
|---------|------|
| `text` | 纯文本消息（默认） |
| `markdown` | Markdown 格式消息 |
| `html` | HTML 格式消息 |

> 如需使用 PushPlus 的 `/send` 完整可选参数（指定发送渠道、回调等），请使用 `extraData.pushplus` 命名空间下的 `custom` 类型，详见[3.3 使用完整可选参数](#33-使用完整可选参数custom-类型)。

### 3.2 Markdown 消息示例

PushPlus 支持以下 Markdown 语法：

```markdown
## 服务器告警通知

**服务器**：192.168.1.100
**告警级别**：<font color="warning">高</font>

> 时间：2024-06-01 14:00
> CPU使用率：95%

请立即处理！
```

支持的格式：
- 标题（`#` ~ `###`）
- 加粗（`**text**`）
- 引用（`> text`）
- 字体颜色：`<font color="info">绿色</font>`、`<font color="comment">灰色</font>`、`<font color="warning">橙红色</font>`

### 3.3 使用完整可选参数（custom 类型）

PushPlus 的 `/send` 接口没有独立的「消息类型」，但提供一组可选参数用于精细化控制推送（如指定发送渠道、异步回调、群推覆盖等）。MagicPush 通过**合成类型 `custom`** 暴露这些参数，使用 `extraData.pushplus` 命名空间透传，无需改动顶层字段。

| 参数 | 说明 | 示例 |
|------|------|------|
| `channelType` | 固定为 `custom`，标识走完整可选参数分支 | `custom` |
| `template` | 消息模板，不填则按 `type` 自动推导 | `markdown`、`json`、`cloudMonitor` |
| `channel` | 发送渠道：微信、App、Webhook、邮件、短信、语音等 | `webhook`、`mail`、`sms` |
| `option` | 渠道配置参数（JSON 对象，自动序列化为字符串） | `{"url":"...","key":"..."}` |
| `callbackUrl` | 异步回调地址，接收发送结果 | `https://example.com/callback` |
| `topic` | 群推编码，覆盖渠道配置中的 topic | `xxxxxx` |
| `timestamp` | 毫秒时间戳，小于当前时间则消息不发送 | `1719600000000` |
| `pre` | 预处理编码（仅会员可用） | `xxxxxx` |

> 💡 `extraData.pushplus` 内的 `title` / `content` / `type` 可覆盖顶层字段，便于在多渠道独立推送时为 PushPlus 指定不同内容。

**请求示例**：使用 `custom` 类型，以 `markdown` 模板推送到第三方 Webhook 并配置回调：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "服务器告警",
    "content": "磁盘使用率已达 98%",
    "type": "text",
    "extraData": {
      "pushplus": {
        "channelType": "custom",
        "template": "markdown",
        "channel": "webhook",
        "option": { "url": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" },
        "callbackUrl": "https://example.com/callback"
      }
    }
  }'
```

`template` 的可选值详见下方[官方支持的消息类型](#官方支持的消息类型)；`channel` 支持 `wechat`、`app`、`extension`、`webhook`、`clawbot`、`cp`、`mail`、`sms`、`voice` 等。

---

## 技术细节

### 消息长度限制

- 消息内容：最长不超过 **50000 字符**

### 频率限制

| 版本 | 每天推送限制 |
|------|--------------
| 免费版 | 200 条/天 |
| 付费版 | 根据套餐不同，最高 10000 条/天 |

> 💡 MagicPush 不会对频率做额外限制，请确保推送频率在 PushPlus 允许的范围内。

### 官方支持的消息类型

PushPlus 官方支持的消息类型（`template` 参数）：

| template 值 | 说明 |
|-------------|------|
| `txt` | 纯文本（默认） |
| `markdown` | Markdown 格式 |
| `html` | HTML 格式 |
| `json` | JSON 格式（用于转发到其它接口） |
| `cloudMonitor` | 阿里云监控报警通知 |
| `github` | GitHub 事件通知 |

MagicPush 会根据 `type` 参数自动映射到对应的 `template` 值。

---

## 常见问题

### Q: 发送消息返回「token 无效」错误？

**原因**：Token 填写错误，或 Token 已过期。

**解决**：
1. 检查 Token 是否完整复制，没有多余空格或换行
2. 重新登录 PushPlus 控制台，复制最新的 Token
3. 确认 Token 没有过期（长期不使用可能会被重置）

### Q: 微信没有收到推送消息？

**原因**：可能有多种情况。

**解决**：
1. 确认微信关注了 PushPlus 公众号
2. 检查是否开启了消息通知（微信设置 → 新消息通知）
3. 消息可能有 1-2 分钟延迟，请耐心等待
4. 检查 PushPlus 控制台，查看消息发送记录

### Q: 提示「超过每日限制」？

**原因**：免费版每天限制 200 条消息。

**解决**：
1. 升级到付费版（在 PushPlus 控制台中升级）
2. 降低推送频率，合并多条消息为一条
3. 使用其他推送渠道（如企业微信、钉钉等）

### Q: 群组推送如何配置？

**解决**：
1. 在 PushPlus 控制台创建群组
2. 将群组编码（Topic）分享给其他用户
3. 其他用户关注群组后，填写 Topic 字段
4. 推送消息时，所有群组成员都会收到

### Q: Markdown 消息格式没有正确渲染？

**原因**：PushPlus 的 Markdown 是语法子集。

**解决**：
1. 参考上方 [Markdown 消息示例](#markdown-消息示例) 中的支持语法
2. 不支持的元素（图片、表格、代码块）不会渲染
3. 可以先使用 `text` 类型测试

### Q: 如何同时推送到多个渠道（微信 + 短信 + 邮件）？

**解决**：
1. 在 PushPlus 控制台中，配置**多渠道推送**
2. 配置完成后，同一条消息会同时推送到所有已配置的渠道

---

## 参考资源

- [PushPlus 官网](https://www.pushplus.plus/)
- [PushPlus 官方文档](https://www.pushplus.plus/doc/)
- [PushPlus GitHub](https://github.com/xnotepad/pushplus)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
