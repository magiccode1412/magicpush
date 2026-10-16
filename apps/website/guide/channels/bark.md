---
title: Bark 推送渠道配置指南
description: 通过 Bark iOS App 实现 iPhone/iPad 推送通知的完整配置教程
outline: deep
---

# Bark 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **Bark** 推送渠道，实现向 iPhone/iPad 推送自定义通知。

## 概述

### 什么是 Bark？

Bark 是一款 iOS 推送通知应用，可以通过简单的 HTTP 请求向你的 iOS 设备推送通知。支持自定义铃声、图标、通知级别等高级功能。

- **官网**：[bark.day.app](https://bark.day.app/)
- **App Store**：搜索「Bark」下载
- **开源地址**：[github.com/Finb/Bark](https://github.com/Finb/Bark)

| 特点 | 说明 |
|------|------|
| 推送目标 | iPhone / iPad（需安装 Bark App） |
| 鉴权方式 | Device Key（在 App 中获取） |
| 配置复杂度 | 低，仅需服务器地址 + Device Key |
| 消息格式 | text（纯文本） |
| 额外功能 | 自定义铃声、图标、通知级别 |

### 前置条件

- 拥有 iPhone 或 iPad
- 已安装 [Bark App](https://apps.apple.com/cn/app/bark/id1400184399)
- 已部署并登录 MagicPush 管理后台

---

## 第一步：在 Bark App 中获取 Device Key

### 1.1 安装并打开 Bark App

1. 在 App Store 搜索 **「Bark」** 并安装
2. 打开 Bark App
3. 首次打开会显示 **「你的设备 Key」**

### 1.2 复制设备 Key 和服务器地址

在 Bark App 首页，你可以看到：

1. **设备 Key**（Device Key）：长按复制
2. **服务器地址**：默认使用官方服务器 `https://api.day.app`
   - 如果需要自托管，可以搭建自己的 Bark 服务端
   - 自托管教程参考：[Bark 服务端部署](https://github.com/Finb/Bark/tree/master/server)

> 📌 **关键信息**：

| 配置项 | 示例值 | 来源 |
|--------|--------|------|
| 服务器地址 | `https://api.day.app` | Bark App 首页 |
| Device Key | `abcdEFGHIJKLMnopQRSTUVwxyZ...` | Bark App 首页，长按复制 |

> 💡 **提示**：如果使用官方服务，服务器地址填写 `https://api.day.app` 即可。如果自托管，填写你的服务器地址。

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择 **「Bark」**。

### 2.3 填写配置信息

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **服务器地址** | Bark 服务端地址 | `https://api.day.app`（官方）或自托管地址 |
| **Device Key** | 设备唯一标识 | 从 Bark App 首页复制 |
| **通知分组**（可选） | 指定推送消息的分组名 | `server-alerts` |
| **推送铃声**（可选） | 自定义通知铃声 | `alarm`、`minuet` 等 |
| **通知级别**（可选） | 控制通知显示方式 | `active`（默认）、`timeSensitive`、`passive`、`critical` |
| **通知图标**（可选） | 自定义图标 URL（iOS 15+） | `https://example.com/icon.png` |

#### 通知级别说明

| 级别 | 值 | 说明 |
|------|-----|------|
| 默认 | `active` | 正常通知，受勿扰模式影响 |
| 时效性通知 | `timeSensitive` | 不受勿扰模式影响 |
| 静默通知 | `passive` | 不亮屏、无声音，仅出现在通知列表 |
| 临界警报 | `critical` | 忽略静音和勿扰模式，强制响铃 |

#### 推送铃声说明

Bark 内置铃声：
- `alarm` - 闹钟声
- `minuet` - 小步舞曲
- `multiwayinvitation` - 多人邀请
- 更多铃声请在 Bark App 中查看

也可以使用系统铃声名称，或自定义铃声（需将音频文件放在服务器上）。

> 💡 **提示**：如果使用官方 Bark 服务，`serverUrl` 填写 `https://api.day.app`。如果自托管，填写你的 Bark 服务端地址。

填写完成后，给渠道起一个易于辨识的**名称**（如「Bark iPhone 推送」），点击 **「保存」**。

### 2.4 测试连通性

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 iOS 设备收到「这是一条来自魔法推送的测试消息」推送通知，说明配置成功
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

> 📌 Bark 只支持 `text` 类型消息。如果发送 `markdown` 或 `html` 类型，MagicPush 会自动转换为纯文本。

### 3.2 使用高级功能

#### 自定义铃声

在 MagicPush 渠道配置中填写 **「推送铃声」** 字段，如 `alarm`。

#### 时效性通知（不受勿扰模式影响）

在渠道配置中，将 **「通知级别」** 选择为 **「时效性通知」**（`timeSensitive`）。

#### 静默通知（不亮屏）

在渠道配置中，将 **「通知级别」** 选择为 **「静默通知」**（`passive`）。

---

## 技术细节

### 消息长度限制

- 消息内容：建议不超过 **1024 字符**（过长可能被截断）

### 自建 Bark 服务器

如果不想使用官方服务，可以自建 Bark 服务端：

1. 参考部署教程：[Bark 服务端 GitHub](https://github.com/Finb/Bark/tree/master/server)
2. 使用 Docker 快速部署：
   ```bash
   docker run -d --name bark -p 8080:8080 finb/bark-server
   ```
3. 部署完成后，在 MagicPush 中填写你的服务器地址（如 `https://bark.example.com`）

### URL 推送方式（不使用 MagicPush 时）

Bark 支持直接通过 URL 推送（无需 MagicPush）：

```
https://api.day.app/你的DeviceKey/标题/内容
```

示例：
```
https://api.day.app/xxxxxxxx/服务器告警/CPU使用率超过90%
```

---

## 常见问题

### Q: 发送消息返回「无效的设备 Key」错误？

**原因**：Device Key 填写错误。

**解决**：
1. 打开 Bark App，长按设备 Key 复制
2. 确认 Key 没有多余空格或换行
3. 重新从 Bark App 复制 Device Key

### Q: iOS 设备没有收到推送通知？

**原因**：可能有多种情况。

**解决**：
1. 确认 Bark App 已在后台运行（iOS 可能杀死后台）
2. 检查 iOS 通知权限是否开启（设置 → Bark → 通知）
3. 如果是自托管服务，确认服务器地址可访问
4. 检查设备 Key 是否匹配

### Q: 推送通知没有声音？

**原因**：可能开启了静音模式，或通知级别为 `passive`。

**解决**：
1. 检查 iPhone 是否处于静音模式
2. 在渠道配置中设置 **「推送铃声」**
3. 将通知级别设置为 `active` 或 `timeSensitive`

### Q: 如何推送到多个设备？

**解决**：
1. 在每个设备的 Bark App 中获取 Device Key
2. 在 MagicPush 中创建多个 Bark 渠道，每个对应一个 Device Key
3. 或者使用 Bark 的「复制 Key」功能（在 App 中操作）

### Q: 自托管 Bark 服务端如何配置？

**解决**：
1. 部署 Bark 服务端（参考 [GitHub](https://github.com/Finb/Bark)）
2. 在 MagicPush 渠道配置中，将 **「服务器地址」** 填写为你的服务器地址（如 `https://bark.example.com`）
3. Device Key 格式与官方服务相同（在 Bark App 中会自动识别自建服务器）

### Q: 临界警报（critical）不工作？

**原因**：iOS 需要特殊权限才能发送临界警报。

**解决**：
1. 需要在 Xcode 项目中开启 `Critical Alerts` 权限
2. 或者使用官方 Bark App（已获取该权限）
3. 自托管服务端需确保证书配置正确

---

## 参考资源

- [Bark 官方网站](https://bark.day.app/)
- [Bark GitHub](https://github.com/Finb/Bark)
- [Bark 参数说明](https://bark.day.app/#/tutorial)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
