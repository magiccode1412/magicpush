---
title: 微信公众号推送渠道配置指南
description: 通过微信公众号模板消息实现推送的完整配置教程
outline: deep
---

# 微信公众号推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置**微信公众号**推送渠道，通过模板消息向关注用户推送通知。

## 概述

### 什么是微信公众号推送？

通过微信公众号的**模板消息**功能，可以向关注用户主动推送结构化通知消息。需要是**服务号**（认证或测试号）才能使用。

| 特点 | 说明 |
|------|------|
| 推送目标 | 关注公众号的用户（通过 OpenID 指定） |
| 鉴权方式 | AppID + AppSecret → access_token（自动管理） |
| 配置复杂度 | 中，需要公众号后台配置 |
| 消息格式 | 模板消息（标题 + 内容，支持颜色） |
| 频率限制 | 默认为每个用户 10 次/天 |

### 前置条件

- 拥有微信公众号（服务号或测试号）
- 已配置消息模板
- 已部署并登录 MagicPush 管理后台

---

## 第一步：在微信公众号后台获取配置信息

### 1.1 获取 AppID 和 AppSecret

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 在左侧导航点击 **「设置与开发」** → **「基本配置」**
3. 找到 **「开发者 ID(AppID)」**，点击 **「复制」**
4. 找到 **「开发者密码(AppSecret)」**，点击 **「重置」**
5. 重置后**立即复制** AppSecret（只显示一次）

> 🔐 **重要**：AppSecret 是敏感凭证，只显示一次，请妥善保管。

### 1.2 创建或选择消息模板

#### 方式一：使用测试号（推荐，无需认证）

1. 在基本配置页面，找到 **「测试号」** 入口
2. 或者使用 [微信测试号平台](https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login)
3. 登录后，在 **「模板消息」** 部分点击 **「新增测试模板」**
4. 填写模板信息，提交后获得 **模板 ID**

#### 方式二：正式服务号

1. 在左侧导航点击 **「功能」** → **「模板消息」**
2. 从**模板库**中选择合适的模板，或**申请自定义模板**
3. 获得 **模板 ID**（格式如 `xxxxxXXXXXXXXXXXxxxxXXXXXxX`）

> 📌 **模板内容示例**：
> ```
> {{title.DATA}}
> {{content.DATA}}
> ```

### 1.3 获取用户 OpenID

1. 在公众平台左侧导航点击 **「用户管理」**
2. 找到目标用户，点击 **「详情」**
3. 在 URL 中可以看到用户的 **OpenID**（或引导用户发送消息后通过接口获取）

> 💡 **开发者提示**：更推荐使用代码通过 `获取用户列表` 接口批量获取 OpenID。

至此，你已获得配置所需的信息：

| 配置项 | 示例值 | 来源 |
|--------|--------|------|
| AppID | `wxXXXXXXXXXXXXXXXX` | 基本配置 → 开发者 ID |
| AppSecret | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | 基本配置 → 开发者密码（重置后显示） |
| 模板 ID | `xxxxxXXXXXXXXXXXxxxxXXXXXxX` | 模板消息 → 模板 ID |
| 用户 OpenID | `oXXXXXXXXXXXXXXXXXXXXXXXXXxX` | 用户管理 → 用户详情 |

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择 **「微信公众号」**。

### 2.3 填写配置信息

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **AppID** | 公众号开发者 ID | `wxXXXXXXXXXXXXXXXX` |
| **AppSecret** | 公众号开发者密码 | 重置后复制的值 |
| **模板 ID** | 消息模板 ID | `xxxxxXXXXXXXXXXXxxxxXXXXXxX` |
| **用户 OpenID** | 接收消息的用户 OpenID，多个用逗号或换行分隔 | `oXXXxX,oYYYyY` |

> 💡 **OpenID 格式提示**：
> - 可以**用逗号分隔**：`oXXXxX,oYYYyY,oZZZzZ`
> - 也可以**每行一个 OpenID**（多行文本）

填写完成后，给渠道起一个易于辨识的**名称**（如「微信公众号通知」），点击 **「保存」**。

### 2.4 测试连通性

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果微信公众号收到测试模板消息，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查

> 💡 **提示**：access_token 由 MagicPush 自动管理，无需手动处理。

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

> 📌 微信公众号模板消息**不支持** `type` 参数的 markdown/html 格式，消息会以模板定义的样式展示。

### 3.2 模板消息数据格式

MagicPush 会自动将 `title` 和 `content` 映射到模板消息的 `data` 字段：

```json
{
  "touser": "oXXXxX...",
  "template_id": "xxxxx...",
  "data": {
    "title": { "value": "系统告警", "color": "#173177" },
    "content": { "value": "CPU 超过 90%...", "color": "#666666" }
  }
}
```

---

## 技术细节

### access_token 管理

MagicPush 自动管理 access_token 的生命周期：

1. **获取**：首次发送消息时自动通过 AppID + AppSecret 获取
2. **缓存**：token 缓存在内存中，有效期为 7200 秒（2 小时）
3. **刷新**：提前 5 分钟自动刷新，避免过期
4. **容错**：如果发送时发现 token 失效，自动清除缓存并重新获取

服务重启后 token 缓存会丢失，首次发送时会自动重新获取，无需人工干预。

### 频率限制

- 默认每个用户 **10 次/天**（模板消息限制）
- 不同模板的限额独立计算

### 消息长度限制

- 模板消息的每个字段：**120 个字符**（含中文）

---

## 常见问题

### Q: 发送消息返回 `40001`（access_token 无效）？

**原因**：AppID 或 AppSecret 填写错误。

**解决**：
1. 确认 AppID 格式正确（以 `wx` 开头）
2. 确认 AppSecret 是重置后复制的值，不是旧值
3. 如果 AppSecret 遗忘，需要重新重置

### Q: 发送消息返回 `40003`（无效的 OpenID）？

**原因**：指定的 OpenID 不存在，或用户未关注公众号。

**解决**：
1. 确认 OpenID 格式正确（以 `o` 开头）
2. 确认用户已关注该公众号
3. 如果用户取关后重新关注，OpenID 不变

### Q: 发送消息返回 `43004`（需要接收者关注）？

**原因**：用户未关注公众号，无法推送模板消息。

**解决**：
1. 引导用户关注公众号
2. 或者在用户关注后再推送

### Q: 测试消息显示「获取 access_token 失败」？

**原因**：AppID 或 AppSecret 错误，或网络无法访问微信 API。

**解决**：
1. 检查 AppID 和 AppSecret 是否填写正确
2. 确认服务器可以访问 `api.weixin.qq.com`
3. 如果在国内服务器，网络通常无问题；海外服务器可能需要代理

### Q: 如何向所有关注者群发消息？

**回答**：模板消息**不支持**群发。如果需要群发，需要使用**群发接口**（需要认证服务号），且每月有次数限制。模板消息只能逐个用户推送。

### Q: 服务号和订阅号有什么区别？

| 类型 | 模板消息 | 群发次数 |
|------|----------|----------|
| 服务号（认证） | ✅ 支持 | 不限 |
| 订阅号（认证） | ❌ 不支持 | 1次/天 |
| 订阅号（未认证） | ❌ 不支持 | 1次/月 |

> 💡 **推荐**：使用**认证服务号**或**测试号**来使用模板消息功能。

---

## 参考资源

- [微信公众平台](https://mp.weixin.qq.com/)
- [获取 access_token API 文档](https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html)
- [发送模板消息 API 文档](https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
