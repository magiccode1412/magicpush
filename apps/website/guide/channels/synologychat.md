---
title: Synology Chat 推送渠道配置指南
description: 通过群晖 Chat Incoming Webhook 实现群聊消息推送的完整配置教程
outline: deep
---

# Synology Chat 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **Synology Chat** 推送渠道，实现向群晖 NAS Chat 群聊发送消息通知。

## 概述

### 什么是 Synology Chat 推送？

Synology Chat 是运行在 Synology NAS DSM 上的即时通讯套件。通过 Incoming Webhook 可以将消息推送到 Chat 频道中。

| 特点 | 说明 |
|------|------|
| 推送目标 | 群晖 NAS Chat 频道 |
| 鉴权方式 | URL 中的 Incoming Webhook Token |
| 配置复杂度 | 低，仅需粘贴 Webhook URL |
| 消息格式 | text（支持 Markdown 加粗、引用等） |
| 频率限制 | 取决于 NAS 性能 |

### 前置条件

- 拥有 Synology NAS，且已安装 **Chat** 套件
- 已部署并登录 MagicPush 管理后台

---

## 第一步：在 Synology Chat 中获取 Incoming Webhook Token

### 1.1 创建 Incoming Webhook 集成

1. 打开 **Synology Chat** 客户端（Web/桌面/移动端均可）
2. 点击左下角 **「设置」** 图标（齿轮）
3. 选择 **「整合」** → **「Bot」**
4. 点击 **「创建」** → 选择 **「Incoming Webhook」**
5. 填写集成名称（如 `MagicPush 通知`）
6. 选择要接收消息的 **频道**
7. 点击 **「创建」**

### 1.2 获取 Webhook URL 和 Token

创建成功后，会显示 **Webhook URL**：

```
https://<你的NAS地址>:5001/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=xxxxxxxxxxxxxxxx
```

> 📌 **关键信息**：URL 中 `token=` 后面的部分就是 Webhook Token。

MagicPush 需要的是**完整的 Webhook URL**（包含 `token` 参数），因为请求时需要带这个 Token。

> 💡 **NAS 地址说明**：
> - 如果使用 HTTPS，端口通常是 `5001`
> - 如果使用 HTTP，端口通常是 `5000`
> - 确保 MagicPush 服务器可以访问该地址（注意防火墙）

至此，你已获得配置所需的信息：

| 配置项 | 示例值 | 来源 |
|--------|--------|------|
| Webhook URL（服务地址） | `https://nas.example.com:5001` | Incoming Webhook 创建成功页面 |
| Token（包含在 URL 中） | `xxxxxxxxxxxxxxxx` | URL 中 `token=` 后面的值 |

> 💡 **提示**：MagicPush 的配置字段是「服务地址」和「Token」，你需要将完整 URL 拆分填写。

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理#

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型#

在弹出的对话框中，从渠道类型下拉列表中选择 **「synologychat」**。

### 2.3 填写配置信息#

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **服务地址** | 群晖 DSM 的访问地址（含端口） | `https://nas.example.com:5001` |
| **Token** | Incoming Webhook Token | `xxxxxxxxxxxxxxxx` |

> 💡 **服务地址格式说明**：
> - 如果使用 HTTPS + 默认端口：`https://nas.example.com:5001`
> - 如果使用 HTTP + 默认端口：`http://nas.example.com:5000`
> - 如果使用了自定义端口：填写实际端口

填写完成后，给渠道起一个易于辨识的**名称**（如「NAS 告警通知」），点击 **「保存」**。

### 2.4 测试连通性#

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 Synology Chat 频道中收到「这是一条来自魔法推送(Magic)的测试消息 🎉」，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查#

---

## 第三步：使用推送#

### 3.1 通过 API 推送#

创建渠道后，可以通过 MagicPush 的标准 API 进行推送：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "NAS 磁盘告警",
    "content": "磁盘 1 使用率超过 90%，请及时处理",
    "type": "text"
  }'
```

支持的消息类型（`type` 参数）：

| type 值 | 说明 |
|---------|------|
| `text` | 纯文本消息（默认），支持部分 Markdown 格式 |
| `html` | HTML 格式消息（MagicPush 自动剥离标签转为纯文本） |

### 3.2 Markdown 支持说明#

Synology Chat 的 Incoming Webhook 支持部分 Markdown 语法：

- 加粗（`**text**`）
- 引用（`> text`）
- 换行（`\n`）

> ⚠️ **注意**：Synology Chat 对 Markdown 的支持有限，不支持标题、列表、代码块等元素。

---

## 技术细节#

### 消息长度限制#

- 消息内容：最长不超过 **4096 字符**

### 请求格式#

MagicPush 发送消息时：

1. 将消息内容构建为 `{"text": "..."}` JSON 字符串
2. 将 JSON 字符串作为 `payload` 表单字段
3. 以 `application/x-www-form-urlencoded` 格式 POST 到 Webhook URL
4. Token 会被 URL 编码后附加到 URL 的 `token` 参数中

### 频率限制#

- 官方未明确说明频率限制
- 建议合理使用，避免短时间内大量推送

---

## 常见问题#

### Q: 发送消息返回「token 无效」错误？#

**原因**：Token 填写错误，或服务地址不正确。

**解决**：
1. 检查服务地址是否完整（含端口号）
2. 检查 Token 是否完整复制，没有多余空格或换行
3. 确认 NAS 地址可以从 MagicPush 服务器访问（尝试 `curl` 测试连通性）
4. 重新从 Synology Chat 整合设置中查看 Webhook URL 并复制

### Q: 发送消息无响应或超时？#

**原因**：MagicPush 服务器无法访问 NAS 地址。

**解决**：
1. 确认 NAS 已开机且 Chat 套件正在运行
2. 检查防火墙设置，确保 MagicPush 服务器可以访问 NAS 的 5000/5001 端口
3. 如果 NAS 在内网，确保 MagicPush 与 NAS 在同一网络或可路由
4. 如果使用 QuickConnect 地址，确保地址正确且可访问

### Q: Synology Chat 中收不到消息，但 API 返回成功？#

**原因**：可能是 Bot 被移除，或频道已删除。

**解决**：
1. 在 Synology Chat 中检查 Bot 是否还在频道成员列表中
2. 如果 Bot 被移除，需要重新创建 Incoming Webhook 集成
3. 检查频道是否还存在

### Q: 如何发送到多个频道？#

**解决**：每个频道需要单独创建一个 Incoming Webhook 集成，每个集成对应一个 MagicPush 渠道。

### Q: 服务地址应该使用 HTTP 还是 HTTPS？#

| 协议 | 端口 | 说明 |
|------|------|------|
| HTTPS | 5001 | 推荐，加密传输 |
| HTTP | 5000 | 仅限内网使用 |

> 💡 **推荐**：使用 HTTPS（端口 5001），安全性更高。

### Q: 与「Webhook」渠道有什么区别？#

| 场景 | 推荐渠道 |
|------|---------|
| 推送到 Synology Chat 频道，配置简单 | **Synology Chat**（本渠道） |
| 推送到任意 HTTP 服务，需要自定义格式 | Webhook |

---

## 参考资源#

- [Synology Chat 官方文档](https://www.synology.com/en-global/dsm/feature/chat)
- [Synology Chat Incoming Webhook 文档](https://kb.synology.com/en-global/DSM/tutorial/How_to_use_Synology_Chat_to_send_notifications)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
