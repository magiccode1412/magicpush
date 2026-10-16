---
title: iGot 推送渠道配置指南
description: 通过 iGot 开放式通知推送服务实现消息推送的完整配置教程
outline: deep
---

# iGot 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **iGot** 推送渠道，实现向 iOS/Android 设备推送消息通知。

## 概述

### 什么是 iGot？

iGot 是一个开放式通知推送服务平台，支持 iOS 和 Android，通过简单的 HTTP 接口即可推送通知。

- **官网**：[push.hellyw.com](https://push.hellyw.com/)
- **文档**：[push.hellyw.com/doc](https://push.hellyw.com/doc/#/)

| 特点 | 说明 |
|------|------|
| 推送目标 | iOS / Android（需安装 iGot 客户端） |
| 鉴权方式 | Key（在 iGot 控制台获取） |
| 配置复杂度 | 低，仅需粘贴 Key |
| 消息格式 | text、markdown（html 自动转为纯文本） |
| 频率限制 | 取决于 iGot 套餐 |

### 前置条件

- 拥有 iGot 账号
- 已安装 iGot 客户端（[App Store](https://apps.apple.com/) / [Google Play](https://play.google.com/)）
- 已部署并登录 MagicPush 管理后台

---

## 第一步：在 iGot 官网获取 Key

### 1.1 注册并登录 iGot

1. 访问 [iGot 官网](https://push.hellyw.com/)
2. 点击右上角 **「登录」**
3. 使用**微信扫码** 登录（推荐）或注册账号

### 1.2 获取 Key

1. 登录后，在控制台首页可以找到 **「Key」**
2. 点击 **「复制」** 按钮，复制 Key 值

> 📌 **Key 示例**：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

> 🔐 **重要**：Key 是敏感凭证，请妥善保管，不要公开分享。

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型#

在弹出的对话框中，从渠道类型下拉列表中选择 **「igot」**。

### 2.3 填写配置信息#

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **API 地址**（可选） | iGot API 地址，留空使用官方公共服务 | `https://push.hellyw.com` |
| **Key** | 在 iGot 控制台获取的 Key | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

> 💡 **关于 API 地址**：
> - 留空则使用**官方公共服务** `https://push.hellyw.com`
> - 如果自建了 iGot 服务，填写你的服务器地址

填写完成后，给渠道起一个易于辨识的**名称**（如「iGot 推送通知」），点击 **「保存」**。

### 2.4 测试连通性#

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 iGot 客户端收到「这是一条来自魔法推送(MagicPush)的测试消息 🎉」，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查#

> 💡 **提示**：客户端接收消息可能有 1-2 分钟延迟，请耐心等待。

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
| `html` | HTML 格式消息（MagicPush 自动剥离标签转为纯文本） |

### 3.2 Markdown 消息示例#

iGot 支持以下 Markdown 语法：

```markdown
## 系统告警通知

**服务器**：192.168.1.100
**告警级别**：⚠️ 高

> 时间：2024-06-01 14:00
> CPU使用率：95%

请立即处理！
```

---

## 技术细节#

### 消息长度限制#

- 消息内容：最长不超过 **256** 个字符（iGot 限制）

### 频率限制#

- 免费版：**200 条/天**
- 付费版：根据套餐不同，限制更高#

---

## 常见问题#

### Q: 发送消息返回「Key 无效」错误？

**原因**：Key 填写错误，或 Key 已过期。

**解决**：
1. 检查 Key 是否完整复制，没有多余空格或换行
2. 重新登录 iGot 控制台，复制最新的 Key
3. 确认 Key 没有过期（长期不使用可能会被重置）#

### Q: iGot 客户端没有收到推送消息？

**原因**：可能有多种情况。

**解决**：
1. 确认 iGot 客户端在后台运行
2. 检查是否开启了消息通知（iOS/Android 设置 → 通知）
3. 消息可能有 1-2 分钟延迟，请耐心等待
4. 检查 iGot 控制台，查看消息发送记录#

### Q: 提示「超过每日限制」？

**原因**：免费版每天限制 200 条消息。

**解决**：
1. 升级到付费版（在 iGot 控制台中升级）
2. 降低推送频率，合并多条消息为一条
3. 使用其他推送渠道（如企业微信、钉钉等）#

### Q: 如何同时推送到多个设备？

**解决**：
1. 在每个设备上安装 iGot 客户端
2. 使用**同一个 Key**，所有设备都会收到消息
3. 或者为不同设备创建不同的 Key，分别配置渠道#

### Q: Markdown 消息格式没有正确渲染？

**原因**：iGot 的 Markdown 是语法子集。

**解决**：
1. 参考上方 [Markdown 消息示例](#markdown-消息示例) 中的支持语法
2. 不支持的元素（图片、表格、代码块）不会渲染
3. 可以先使用 `text` 类型测试#

---

## 参考资源#

- [iGot 官方网站](https://push.hellyw.com/)
- [iGot 官方文档](https://push.hellyw.com/doc/#/)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
