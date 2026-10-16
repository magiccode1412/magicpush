---
title: ntfy 推送渠道配置指南
description: 通过 ntfy 开源推送通知服务实现消息推送的完整配置教程
outline: deep
---

# ntfy 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **ntfy** 推送渠道，实现向 iOS/Android 设备推送消息。

## 概述

### 什么是 ntfy？

ntfy（原名 ntfy.sh）是一个轻量级的开源推送通知服务，支持 iOS、Android、桌面端，通过简单的 HTTP PUT/POST 请求即可推送通知。

- **官网**：[ntfy.sh](https://ntfy.sh/)
- **API 文档**：[docs.ntfy.sh/publish/](https://docs.ntfy.sh/publish/)

| 特点 | 说明 |
|------|------|
| 推送目标 | iOS / Android / 桌面端（需安装 ntfy 客户端） |
| 鉴权方式 | 匿名（默认）、Basic Auth、Bearer Token |
| 配置复杂度 | 低，仅需 Topic 名称 |
| 消息格式 | text、markdown |
| 服务方式 | 官方公共云（免费）或自托管 |

### 前置条件

- 已安装 ntfy 客户端（[iOS](https://apps.apple.com/) / [Android](https://play.google.com/) / [F-Droid](https://f-droid.org/)）
- 已部署并登录 MagicPush 管理后台

---

## 第一步：准备 ntfy Topic#

### 1.1 选择 Topic 名称#

ntfy 使用 **Topic**（主题）来标识消息频道，相当于频道名称。

> 📌 **Topic 命名规则**：
> - 只允许**字母、数字、下划线、连字符**
> - 建议选择一个**不易被猜到**的名字（类似密码）
> - 示例：`myapp_alerts_prod`、`home_camera_motion`、`server_backup_done`

> 💡 **安全提示**：
> - Topic 名称就是访问凭证，任何知道 Topic 名称的人都可以订阅和推送
> - 不要使用常见的单词（如 `test`、`alert` 等）
> - 建议使用随机字符串（如 `myapp_a7b3c9d2`）

### 1.2（可选）在 ntfy 客户端中订阅 Topic#

1. 打开 ntfy 客户端
2. 点击 **「+」** 订阅新 Topic
3. 输入你的 Topic 名称
4. 点击 **「订阅」**

> 💡 如果不想在客户端中提前订阅，也可以在收到第一条消息时，客户端会提示你订阅该 Topic。

### 1.3（可选）自建 ntfy 服务#

如果不想使用官方公共云，可以自托管 ntfy 服务端：

1. 参考部署文档：[ntfy 自托管文档](https://docs.ntfy.sh/install/)
2. 部署完成后，记录你的 **自建服务器地址**（如 `https://ntfy.example.com`）

---

## 第二步：在 MagicPush 中添加渠道#

### 2.1 进入渠道管理#

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮#

### 2.2 选择渠道类型#

在弹出的对话框中，从渠道类型下拉列表中选择 **「ntfy」**。

### 2.3 填写配置信息#

根据第一步准备的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **服务器地址**（可选） | ntfy 服务端地址，留空使用官方公共云 | `https://ntfy.sh`（默认）或 `https://ntfy.example.com` |
| **Topic 名称** | 消息频道名称（相当于凭证） | `myapp_a7b3c9d2` |
| **用户名**（可选） | Basic Auth 用户名，与 Access Token 二选一 | `myuser` |
| **密码**（可选） | Basic Auth 密码，与用户名配对使用 | `mypassword` |
| **Access Token**（可选） | Bearer Token 鉴权，与用户名密码二选一 | `tk_xxxxx...` |
| **消息优先级**（可选） | 1-5，控制通知振动和声音 | `3`（默认） |
| **标签**（可选） | 通知标签，逗号分隔，支持 emoji | `warning,backup` |
| **操作按钮**（可选） | JSON 数组，最多 3 个，在通知中显示按钮 | `[{"action":"view","label":"打开","url":"..."}]` |

> 💡 **关于鉴权**：
> - **官方公共云 `ntfy.sh` 不需要鉴权**（匿名使用）
> - **自托管服务可以启用鉴权**，需要配置用户名密码或 Access Token
> - **优先级说明**（控制手机通知方式）：
>   | 优先级 | 值 | 说明 |
>   |--------|-----|------|
>   | Min | `1` | 静默通知，无振动无声音 |
>   | Low | `2` | 低优先级，轻微振动 |
>   | Default | `3` | 正常通知（推荐） |
>   | High | `4` | 高优先级，强烈振动 |
>   | Max/Urgent | `5` | 紧急通知，持续提醒 |

> 💡 **关于标签（Tags）**：
> - 标签会显示在通知旁边，支持 emoji 短码（会自动转换）
> - 示例：`warning` → ⚠️、`backup` → 💾、`ssh-login` → 🔐
> - 多个标签用逗号分隔：`warning,backup,ssh-login`

> 💡 **关于操作按钮（Actions）**：
> - 最多 3 个按钮，点击后执行指定操作
> - JSON 格式：`[{"action":"view","label":"打开面板","url":"https://..."}]`
> - 支持的动作：`view`（打开链接）、`http`（发起 HTTP 请求）、`broadcast`（发送广播）、`copy`（复制文本）

填写完成后，给渠道起一个易于辨识的**名称**（如「ntfy 服务器告警」），点击 **「保存」**。

### 2.4 测试连通性#

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 ntfy 客户端收到「这是一条来自魔法推送(MagicPush)的测试消息 🎉」，说明配置成功
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
| `markdown` | Markdown 格式消息（ntfy 原生支持） |
| `html` | HTML 格式（会自动转为纯文本） |

### 3.2 Markdown 消息示例#

ntfy **原生支持** Markdown 格式（通过 `Markdown: yes` Header）：

```markdown
## 系统告警通知

**服务器**：192.168.1.100
**告警级别**：⚠️ 高

> 时间：2024-06-01 14:00
> CPU 使用率：95%

请立即处理！
```

### 3.3 使用标签和按钮#

发送带标签和操作按钮的消息：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "SSH 登录告警",
    "content": "服务器 192.168.1.100 有新的 SSH 登录",
    "type": "text",
    "tags": "warning,ssh-login",
    "actions": "[{\"action\":\"view\",\"label\":\"查看详情\",\"url\":\"https://monitor.example.com/alert/12345\"}]"
  }'
```

---

## 技术细节#

### 消息长度限制#

- 消息内容：建议不超过 **4096 字符**

### 官方公共云限制#

| 限制项 | 数值 |
|--------|------|
| 每秒请求数 | 有限制（防止滥用） |
| 每条消息大小 | 有限制 |
| Topic 数量 | 无限制 |

> 💡 如果使用官方公共云发送大量消息，建议自建 ntfy 服务。

### 自托管说明#

如果使用自托管服务：

1. 确保服务器地址可访问
2. 在 MagicPush 配置中填写自建服务器地址
3. 如果启用了鉴权，需要配置用户名密码或 Access Token
4. 自托管服务无公共云的频率限制

---

## 常见问题#

### Q: 发送消息返回「Topic 格式不正确」错误？

**原因**：Topic 名称包含非法字符。

**解决**：
1. 确认 Topic 只包含**字母、数字、下划线、连字符**
2. 不包含空格、中文、特殊字符
3. 示例正确：`myapp_alerts`、`server-01-backup`

### Q: 客户端没有收到推送消息？

**原因**：可能有多种情况。

**解决**：
1. 确认 ntfy 客户端已订阅该 Topic
2. 检查 iOS/Android 通知权限是否开启
3. 确认 Topic 名称拼写正确（区分大小写）
4. 测试消息可能有短暂延迟，请耐心等待

### Q: 自建服务无法连接？

**原因**：服务器地址填写错误，或服务器不可访问。

**解决**：
1. 检查服务器地址格式是否正确（以 `http://` 或 `https://` 开头）
2. 确认服务器已启动并可访问
3. 检查防火墙设置，确保端口已开放（默认 80/443）
4. 如果启用了鉴权，确认用户名密码或 Access Token 正确

### Q: 如何推送到多个设备？

**解决**：
1. 在每个设备上安装 ntfy 客户端
2. 每个设备都订阅**同一个 Topic**
3. 向该 Topic 推送消息时，所有订阅设备都会收到通知

### Q: 标签中的 emoji 短码如何工作？

**回答**：ntfy 会自动将标签中的 emoji 短码转换为 emoji 图标：

| 短码 | emoji |
|--------|-------|
| `warning` | ⚠️ |
| `backup` | 💾 |
| `ssh-login` | 🔐 |
| `fire` | 🔥 |
| `check` | ✅ |

完整列表参考：[ntfy 标签文档](https://docs.ntfy.sh/tags/)

### Q: 优先级 5（Urgent）不工作？

**原因**：需要 ntfy Android 客户端授予特殊权限（Android 8+）。

**解决**：
1. 在 Android 上，进入 ntfy 应用设置
2. 开启「覆盖勿扰模式」或类似权限
3. 或者在 iOS 上，Urgent 优先级需要特殊配置

---

## 参考资源#

- [ntfy 官方网站](https://ntfy.sh/)
- [ntfy API 文档](https://docs.ntfy.sh/publish/)
- [ntfy 自托管文档](https://docs.ntfy.sh/install/)
- [ntfy GitHub](https://github.com/binwiederhier/ntfy)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
