---
title: PushMe 推送渠道配置指南
description: 通过 PushMe Android 应用实现消息推送的完整配置教程
outline: deep
---

# PushMe 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **PushMe** 推送渠道，实现向 Android 设备推送消息。

## 概述

### 什么是 PushMe？

PushMe 是一个轻量级的 Android 消息推送客户端，支持 text、markdown、html 三种消息格式，可以通过简单的 HTTP 接口推送通知。

- **官网**：[push.i-i.me](https://push.i-i.me/)
- **API 文档**：[push.i-i.me/docs/index](https://push.i-i.me/docs/index)

| 特点 | 说明 |
|------|------|
| 推送目标 | Android 设备（需安装 PushMe App） |
| 鉴权方式 | Push Key（推荐）或 Temp Key（临时测试） |
| 配置复杂度 | 低，仅需粘贴 Push Key |
| 消息格式 | text、markdown、html（原生支持） |
| 服务方式 | 官方服务（免费）或自托管 |

### 前置条件

- Android 设备已安装 [PushMe App](https://push.i-i.me/)
- 已部署并登录 MagicPush 管理后台

---

## 第一步：在 PushMe App 中获取 Push Key#

### 1.1 安装并打开 PushMe#

1. 在 Android 设备上安装 **PushMe** App
2. 打开 PushMe App
3. 同意隐私政策后，进入主界面

### 1.2 获取 Push Key#

1. 在主界面，找到并点击 **「获取 push_key」** 按钮
2. App 会显示你的 **Push Key**（类似 `PM_xxxxx...`）

> 📌 **Push Key 示例**：`PM_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

> 💡 **两种鉴权方式**：
> | 方式 | 说明 | 推荐度 |
> |------|------|----------
> | **Push Key** | 正式使用，稳定可靠 | ⭐⭐⭐⭐⭐ 推荐 |
> | **Temp Key** | 临时测试用，仅支持官方服务 | ⭐⭐ 仅测试用 |
>
> - **Push Key**：在 App 中获取，用于身份验证，正式使用请配置此项
> - **Temp Key**：临时密钥，仅用于快速测试，不支持自托管服务

### 1.3（可选）自建 PushMe 服务#

如果不想使用官方服务，可以自托管 PushMe 服务端：

1. 参考部署文档：[PushMe 文档](https://push.i-i.me/docs/index)
2. 部署完成后，记录你的 **自建服务器地址**（如 `https://push.example.com`）

> ⚠️ **注意**：Temp Key 仅支持官方服务，如果使用自托管服务，必须配置 Push Key。

---

## 第二步：在 MagicPush 中添加渠道#

### 2.1 进入渠道管理#

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮#

### 2.2 选择渠道类型#

在弹出的对话框中，从渠道类型下拉列表中选择 **「PushMe」**。

### 2.3 填写配置信息#

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **服务器地址**（可选） | PushMe 服务端地址，留空使用官方服务 | `https://push.i-i.me` 或 `https://push.example.com` |
| **Push Key**（推荐） | 在 PushMe App 中获取的 push_key | `PM_xxxxx...` |
| **Temp Key**（可选） | 临时推送密钥，仅用于测试 | `TMP_xxxxx...` |

> 💡 **配置规则**：
> - **Push Key 和 Temp Key 不能同时为空**
> - **Temp Key 仅支持官方服务**：如果填写了 Temp Key 但没有 Push Key，系统会强制使用官方地址 `https://push.i-i.me`
> - **推荐使用 Push Key**：更稳定，支持自托管服务

填写完成后，给渠道起一个易于辨识的**名称**（如「PushMe Android 通知」），点击 **「保存」**。

### 2.4 测试连通性#

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 PushMe App 收到「这是一条来自魔法推送的测试消息，如果您收到此消息，说明配置正确！」，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查

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
| `markdown` | Markdown 格式消息（PushMe 原生支持） |
| `html` | HTML 格式消息（PushMe 原生支持） |

### 3.2 Markdown 消息示例#

PushMe **原生支持** Markdown 格式：

```markdown
## 系统告警通知

**服务器**：192.168.1.100
**告警级别**：⚠️ 高

> 时间：2024-06-01 14:00
> CPU 使用率：95%

请立即处理！
```

### 3.3 HTML 消息示例#

PushMe **原生支持** HTML 格式：

```html
<h2>🚨 系统告警通知</h2>
<p><strong>服务器：</strong>192.168.1.100</p>
<p><strong>告警级别：</strong><span style="color:red;">高</span></p>
<hr>
<p><a href="https://monitor.example.com/alert/12345">查看详情</a></p>
```

---

## 技术细节#

### 消息长度限制#

- 消息内容：建议不超过 **2000 字符**

### Push Key vs Temp Key#

| 对比项 | Push Key | Temp Key |
|--------|----------|-----------
| 获取方式 | PushMe App 中获取 | PushMe App 中获取（临时） |
| 稳定性 | 高，长期有效 | 低，临时使用 |
| 自托管支持 | ✅ 支持 | ❌ 仅支持官方服务 |
| 推荐用途 | 正式使用 | 快速测试 |

### 自托管说明#

如果使用自托管服务：

1. 确保服务器地址可访问
2. 在 MagicPush 配置中填写自建服务器地址
3. 必须使用 **Push Key**，Temp Key 不支持自托管

---

## 常见问题#

### Q: 发送消息返回「Push Key 和 Temp Key 不能同时为空」错误？

**原因**：两种鉴权方式都没有填写。

**解决**：
1. 在 PushMe App 中获取 **Push Key** 并填写（推荐）
2. 或者获取 **Temp Key** 并填写（仅测试用）
3. 至少填写一个 Key

### Q: 配置了 Temp Key 但自建服务器地址不生效？

**原因**：Temp Key 仅支持官方服务。

**解决**：
1. 获取 **Push Key**（在 PushMe App 中）
2. 填写 Push Key 到 MagicPush
3. 然后可以填写自托管服务器地址

### Q: Android 设备没有收到推送消息？

**原因**：可能有多种情况。

**解决**：
1. 确认 PushMe App 在后台运行
2. 检查 Android 通知权限是否开启（设置 → 应用 → PushMe → 通知）
3. 检查系统省电策略，确保 PushMe 不被杀死后台
4. 测试消息可能有短暂延迟，请耐心等待

### Q: 自建服务无法连接？

**原因**：服务器地址填写错误，或服务器不可访问。

**解决**：
1. 检查服务器地址格式是否正确（以 `http://` 或 `https://` 开头）
2. 确认服务器已启动并可访问
3. 检查防火墙设置，确保端口已开放
4. 确保使用的是 Push Key，不是 Temp Key

### Q: Markdown/HTML 消息格式没有正确渲染？

**原因**：PushMe 原生支持 Markdown 和 HTML，可能是消息类型未正确设置。

**解决**：
1. 在 API 调用时，确保 `type` 参数设置为 `markdown` 或 `html`
2. 如果 `type` 为 `text`，消息会以纯文本显示
3. 检查 PushMe App 版本是否支持该格式

### Q: 如何同时推送到多个设备？

**解决**（官方服务）：
1. 在每个设备上安装 PushMe App
2. 每个设备会有一个独立的 Push Key
3. 在 MagicPush 中创建多个 PushMe 渠道，每个对应一个 Push Key
4. 或者使用**广播接口**（如果 PushMe 支持）

---

## 参考资源#

- [PushMe 官方网站](https://push.i-i.me/)
- [PushMe API 文档](https://push.i-i.me/docs/index)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
