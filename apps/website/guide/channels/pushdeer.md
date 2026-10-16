---
title: PushDeer 推送渠道配置指南
description: 通过 PushDeer 开源推送服务实现消息推送的完整配置教程
outline: deep
---

# PushDeer 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **PushDeer** 推送渠道，实现向 iOS/Android/Mac 设备推送消息。

## 概述

### 什么是 PushDeer？

PushDeer 是一个开源的无 App 推送服务，支持 iOS、Android、Mac 多平台，通过简单的 HTTP 接口即可推送通知。

- **官网**：[github.com/easychen/pushdeer](https://github.com/easychen/pushdeer)
- **官方公共云**：`https://api2.pushdeer.com`

| 特点 | 说明 |
|------|------|
| 推送目标 | iOS / Android / Mac（需安装 PushDeer 客户端） |
| 鉴权方式 | PushKey（在客户端中获取） |
| 配置复杂度 | 低，仅需粘贴 PushKey |
| 消息格式 | text、markdown |
| 服务方式 | 官方公共云（免费）或自托管 |

### 前置条件

- 已安装 PushDeer 客户端（[App Store](https://apps.apple.com/) / [Google Play](https://play.google.com/)）
- 已部署并登录 MagicPush 管理后台

---

## 第一步：在 PushDeer 客户端中获取 PushKey

### 1.1 安装并打开 PushDeer

1. 在手机或 Mac 上安装 **PushDeer** 客户端
2. 打开 PushDeer App
3. 点击底部 **「Key」** 标签页

### 1.2 创建并复制 PushKey**

1. 在 Key 页面，点击 **「+」** 创建新 Key
2. 可以设置 Key 的名称（如 `MagicPush`）
3. 点击 **「复制」** 按钮，复制 PushKey 值

> 📌 **PushKey 示例**：`PDUxxxxx...`

> 💡 **每个 Key 可以绑定不同的设备组合**：
> - 创建 Key 时可以选择绑定哪些设备
> - 推送消息时，该 Key 绑定的所有设备都会收到通知
> - 可以为不同场景创建不同的 Key

### 1.3（可选）自建 PushDeer 服务

如果不想使用官方公共云，可以自托管 PushDeer 服务端：

1. 参考部署文档：[PushDeer 部署指南](https://github.com/easychen/pushdeer#部署)
2. 部署完成后，记录你的 **自建服务器地址**（如 `https://pushdeer.example.com`）

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择 **「pushdeer」**。

### 2.3 填写配置信息#

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **API 地址**（可选） | PushDeer 服务端地址，留空使用官方公共云 | `https://pushdeer.example.com` |
| **PushKey** | 在 PushDeer 客户端中创建的 Key | `PDUxxxxx...` |

> 💡 **关于 API 地址**：
> - 留空则使用**官方公共云** `https://api2.pushdeer.com`（免费使用）
> - 自建服务请填写你的服务器地址
> - 官方公共云有合理的频率限制，个人使用通常足够

填写完成后，给渠道起一个易于辨识的**名称**（如「PushDeer 通知」），点击 **「保存」**。

### 2.4 测试连通性#

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 PushDeer 客户端收到「这是一条来自魔法推送(MagicPush)的测试消息 🎉」，说明配置成功
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
| `markdown` | Markdown 格式消息 |
| `html` | HTML 格式（会自动转为纯文本） |

### 3.2 Markdown 消息示例#

PushDeer 支持 Markdown 格式：

```markdown
## 系统告警通知

**服务器**：192.168.1.100
**告警级别**：⚠️ 高

> 时间：2024-06-01 14:00
> CPU 使用率：95%

请立即处理！
```

---

## 技术细节#

### 消息长度限制#

- 消息内容：建议不超过 **2000 字符**

### 频率限制#

- 官方公共云：有合理的频率限制，具体请参考 [PushDeer 文档](https://github.com/easychen/pushdeer)

### 自托管说明#

如果使用自托管服务：

1. 确保服务器地址可访问
2. 在 MagicPush 配置中填写自建服务器地址
3. 自托管服务的频率限制取决于你的服务器配置

---

## 常见问题#

### Q: 发送消息返回「PushKey 无效」错误？

**原因**：PushKey 填写错误，或 Key 已被删除。

**解决**：
1. 打开 PushDeer 客户端，进入「Key」标签页
2. 确认 Key 是否存在
3. 重新复制 PushKey 并填写到 MagicPush

### Q: 客户端没有收到推送消息？

**原因**：可能有多种情况。

**解决**：
1. 确认 PushDeer 客户端在后台运行
2. 检查 iOS/Android 通知权限是否开启
3. 确认设备已绑定到该 PushKey
4. 测试消息可能有短暂延迟，请耐心等待

### Q: 自建服务无法连接？

**原因**：服务器地址填写错误，或服务器不可访问。

**解决**：
1. 检查 API 地址格式是否正确（以 `http://` 或 `https://` 开头）
2. 确认服务器已启动并可访问
3. 检查防火墙设置，确保端口已开放

### Q: 如何推送到多个设备？

**解决**：
1. 在 PushDeer 客户端中，编辑 Key
2. 选择绑定多个设备
3. 使用该 Key 推送时，所有绑定的设备都会收到通知

### Q: Markdown 消息格式没有正确渲染？

**原因**：PushDeer 的 Markdown 支持有限。

**解决**：
1. 使用基础 Markdown 语法（加粗、标题、引用等）
2. 不支持的元素（图片、表格、代码块）可能不会渲染
3. 可以先使用 `text` 类型测试

---

## 参考资源#

- [PushDeer GitHub](https://github.com/easychen/pushdeer)
- [PushDeer 官方公共云](https://api2.pushdeer.com)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
