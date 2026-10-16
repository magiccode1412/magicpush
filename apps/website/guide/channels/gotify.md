---
title: Gotify 推送渠道配置指南
description: 通过 Gotify 自托管推送通知服务器实现消息推送的完整配置教程
outline: deep
---

# Gotify 推送渠道配置指南#

本教程将指导你如何在 MagicPush（魔法推送）中配置 **Gotify** 推送渠道，实现向 iOS/Android/桌面端推送消息通知。

## 概述#

### 什么是 Gotify？

Gotify 是一个开源的**自托管**推送通知服务器，完全由自己部署和维护，无外部依赖。

- **官网**：[gotify.net](https://gotify.net/)
- **API 文档**：[gotify.net/api-docs](https://gotify.net/api-docs)

| 特点 | 说明 |
|------|------|
| 推送目标 | iOS / Android / 桌面端（需安装 Gotify 客户端） |
| 鉴权方式 | Application Token（X-Gotify-Key） |
| 配置复杂度 | 中，需要自托管服务器 |
| 消息格式 | text、markdown（通过 extras） |
| 频率限制 | 无限制（取决于服务器性能） |

### 前置条件#

- 已**自托管 Gotify 服务端**（参考 [部署文档](https://gotify.net/install)）
- 已创建 Gotify 应用并获取 Application Token
- 已安装 Gotify 客户端（[iOS](https://apps.apple.com/) / [Android](https://play.google.com/) / [桌面端](https://gotify.net/download)）
- 已部署并登录 MagicPush 管理后台

---

## 第一步：准备 Gotify 配置信息#

### 1.1 部署 Gotify 服务端（如未部署）#

参考官方部署文档：[gotify.net/install](https://gotify.net/install)

快速启动（Docker）：

```bash
docker run -d --name gotify -p 8080:80 gotify/server
```

### 1.2 创建应用并获取 Application Token#

1. 打开 Gotify Web UI（如 `https://gotify.example.com`）
2. 点击右上角 **「Create Application」**
3. 填写应用名称（如 `MagicPush`）
4. 创建后，点击应用名称，复制 **「Application Token」**

> 📌 **Application Token 示例**：`AbCdEfGhIjKlMnOpQrStUvWxYz0123456789`

> 🔐 **重要**：Application Token 是敏感凭证，请妥善保管。

### 1.3 获取 Gotify 服务器地址#

| 配置项 | 示例值 | 来源 | |
|--------|--------|------|
| 服务器地址 | `https://gotify.example.com` | 你的 Gotify 部署地址 | |

> 💡 **提示**：Gotify 是完全自托管的，你需要有自己的服务器地址。

---

## 第二步：在 MagicPush 中添加渠道#

### 2.1 进入渠道管理#

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮#

### 2.2 选择渠道类型#

在弹出的对话框中，从渠道类型下拉列表中选择 **「Gotify」**。

### 2.3 填写配置信息#

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **服务器地址** | Gotify 服务端地址 | `https://gotify.example.com` |
| **Application Token** | 应用的访问令牌 | `AbCdEfGhIjKlMnOpQrStUvWxYz...` |
| **消息优先级**（可选） | 0-10，默认 5 | `5` |

> 💡 **优先级说明**：
> | 优先级 | 说明 |
> |--------|------|
> | 0 | 静默通知，无振动无声音 |
> | 1-3 | 低优先级 |
> | 4-7 | 正常优先级（推荐 5） |
> | 8-10 | 高优先级，持续提醒 |

填写完成后，给渠道起一个易于辨识的**名称**（如「Gotify 推送」），点击 **「保存」**。

### 2.4 测试连通性#

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 Gotify 客户端收到「这是一条来自魔法推送的测试消息」，说明配置成功
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
    "title": "系统告警",
    "content": "服务器 CPU 使用率超过 90%，请及时处理",
    "type": "markdown"
  }'
```

支持的消息类型（`type` 参数）：

| type 值 | 说明 |
|---------|------|
| `text` | 纯文本消息（默认） |
| `markdown` | Markdown 格式消息（通过 extras 实现） |
| `html` | HTML 格式（会自动转为纯文本） |

### 3.2 Markdown 消息示例#

当 `type` 为 `markdown` 时，MagicPush 会自动设置 `extras['client::display'] = { contentType: 'text/markdown' }`：

```markdown
## 系统告警通知！

**服务器**：192.168.1.100
**告警级别**：⚠️ 高

> 时间：2024-06-01 14:00
> CPU使用率：95%

请立即处理！
```

### 3.3 添加点击跳转链接#

在 API 调用时，可以携带 `url` 字段，点击通知时会跳转到该链接：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统告警",
    "content": "服务器 CPU 使用率超过 90%",
    "type": "text",
    "url": "https://monitor.example.com/alert/12345"
  }'
```

---

## 技术细节#

### 消息长度限制#

- 消息内容：建议不超过 **2048** 字符#

### 优先级（Priority）#

Gotify 的消息优先级控制客户端的振动和声音方式：

| 优先级 | 值 | 说明 |
|--------|-----|------|
| 最低 | 0 | 静默，无振动无声音 |
| 低 | 1-3 | 轻微振动 |
| 正常 | 4-7 | 正常振动（推荐 5） |
| 高 | 8-10 | 强烈振动，持续提醒 |

### Extras（扩展字段）#

MagicPush 支持通过 `extras` 添加扩展字段：

| Extra Key | 说明 |
|-----------|------|
| `client::display` | 控制消息显示方式（如 Markdown） |
| `client::notification::click` | 点击通知后的跳转 URL |# |

---

## 常见问题#

### Q: 发送消息返回「服务器地址不能为空」错误？

**原因**：服务器地址未填写。

**解决**：
1. 确认已部署 Gotify 服务端
2. 填写完整的服务器地址（如 `https://gotify.example.com`）
3. 确保地址以 `http://` 或 `https://` 开头#

### Q: 发送消息返回 401 错误？

**原因**：Application Token 填写错误。

**解决**：
1. 打开 Gotify Web UI
2. 进入应用详情页，重新复制 Application Token
3. 确保 Token 没有多余空格或换行#

### Q: Gotify 客户端没有收到推送消息？

**原因**：可能有多种情况。

**解决**：
1. 确认 Gotify 客户端在后台运行
2. 检查是否开启了消息通知（iOS/Android 设置 → 通知）
3. 确认 Gotify 服务端正常运行
4. 检查服务器地址是否正确#

### Q: 如何推送到多个设备？

**解决**：
1. 在每个设备上安装 Gotify 客户端
2. 使用**同一个 Application Token**，所有设备都会收到消息
3. 或者为不同设备创建不同的应用，分别配置渠道#

### Q: 自建 Gotify 服务如何配置？

**解决**：
1. 参考 [Gotify 部署文档](https://gotify.net/install)
2. 部署完成后，在 MagicPush 中填写你的服务器地址
3. 在 Gotify Web UI 中创建应用并获取 Application Token#

### Q: Markdown 消息没有正确渲染？

**原因**：需要在 Gotify 客户端中启用 Markdown 显示。

**解决**：
1. 确保 `type` 参数设置为 `markdown`
2. Gotify 客户端会自动根据 `extras` 渲染 Markdown
3. 如果客户端版本较旧，可能不支持 Markdown#

---

## 参考资源#

- [Gotify 官方网站](https://gotify.net/)
- [Gotify API 文档](https://gotify.net/api-docs)
- [Gotify GitHub](https://github.com/gotify/android/)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
