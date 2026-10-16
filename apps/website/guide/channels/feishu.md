---
title: 飞书群机器人推送渠道配置指南
description: 通过飞书群机器人实现群聊消息推送的完整配置教程
outline: deep
---

# 飞书群机器人推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置**飞书群机器人**推送渠道，实现向飞书群聊发送文本和交互式卡片消息。

## 概述

### 什么是飞书群机器人？

飞书群机器人是飞书内置的群聊机器人功能，支持发送文本消息和交互式卡片消息，可实现丰富的消息展示和交互能力。

| 特点 | 说明 |
|------|------|
| 推送目标 | 飞书群聊 |
| 鉴权方式 | Webhook URL（可选签名校验） |
| 配置复杂度 | 低，仅需粘贴 Webhook 地址 |
| 消息格式 | text、interactive（卡片） |
| 频率限制 | **100 次/分钟**、**5 次/秒**（单租户单机器人） |
| 请求体大小 | 不超过 **20 KB** |

> ⚠️ **重要提醒**：建议发送消息尽量避开 10:00、17:30 等整点及半点时间，否则可能因系统压力导致 **11232 限流错误**，造成消息发送失败。

### 前置条件

- 拥有飞书账号，且是某个群的管理员或群成员
- 已部署并登录 MagicPush 管理后台

---

## 第一步：在飞书群中获取机器人 Webhook 地址

### 1.1 添加群机器人

1. 打开飞书，进入需要添加机器人的**群聊**
2. 点击右上角 **「···」** 菜单按钮
3. 在菜单中点击 **「群机器人」**
4. 点击 **「添加机器人」**
5. 在机器人列表中找到 **「自定义机器人」**，点击 **「添加」**
6. 填写机器人信息：
   - **机器人名称**：如 `MagicPush 通知`
   - **描述**：可选，如 `接收系统告警通知`
   - **安全设置**：可选择启用「签名校验」
7. 点击 **「添加」**

> 💡 **提示**：官方文档： [在群组中添加自定义机器人](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot#399d949c)。

### 1.2 获取 Webhook 地址和 Secret

添加成功后，机器人会出现在群聊中，并收到一条欢迎消息。同时：

1. 在群聊中，点击刚添加的**机器人头像**
2. 在机器人详情页，可以找到 **Webhook 地址** 和 **Secret**（如果启用了签名校验）

> 📌 **关键信息**：

| 配置项 | 示例值 | 来源 |
|--------|--------|------|
| Webhook 地址 | `https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx...` | 机器人详情页 |
| Secret（可选） | `xxxxxxxxxxxxxxxxxxxx` | 机器人详情页（启用签名校验后可见） |

> 💡 **提示**：Webhook 地址格式为 `https://open.feishu.cn/open-apis/bot/v2/hook/<token>`，其中 `<token>` 是机器人的唯一标识。

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择 **「飞书」**。

### 2.3 填写配置信息

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **Webhook 地址** | 飞书机器人的完整 Webhook 地址 | `https://open.feishu.cn/open-apis/bot/v2/hook/...` |
| **Secret 密钥（可选）** | 签名校验密钥，留空则不校验签名 | `xxxxxxxxxxxxxxxxxxxx` |

> 💡 **签名校验说明**：
> - 如果在飞书机器人设置中启用了「签名校验」，**必须**填写 Secret
> - 如果未启用签名校验，Secret 留空即可
> - MagicPush 会自动计算签名并附加到请求中，你无需手动处理

填写完成后，给渠道起一个易于辨识的**名称**（如「运维监控群」），点击 **「保存」**。

### 2.4 测试连通性

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果飞书群中收到测试消息，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查

---

## 第三步：使用推送

### 3.1 通过 API 推送

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "服务告警",
    "content": "**服务名称**：api-server\n**告警级别**：<font color=\"orange\">高</font>\n\n请立即处理！",
    "type": "markdown"
  }'
```

支持的消息类型（`type` 参数）：

| type 值 | 说明 |
|---------|------|
| `text` | 纯文本消息（默认） |
| `markdown` | 交互式卡片消息（飞书将 Markdown 渲染为卡片） |
| `html` | HTML 格式消息（MagicPush 自动剥离标签转为纯文本发送） |

### 3.2 卡片消息示例

当 `type` 为 `markdown` 时，MagicPush 会自动将消息包装为飞书交互式卡片：

```markdown
**服务告警通知**

> **服务**：api-server
> **环境**：生产
> **时间**：2024-06-01 14:00

CPU 使用率超过 90%，请及时处理！
```

飞书卡片消息支持的元素：
- 加粗（`**text**`）
- 引用块（`> text`）
- 换行（`\n`）
- 文本颜色标注

### 3.3 特有消息类型

除了通用的 `text` 和 `markdown` 类型外，飞书群机器人还支持以下**特有消息类型**，通过 `extraData` 参数发送：

::: tip 命名空间隔离
extraData 采用**命名空间隔离 + 类型自包含**设计，`channelType` 必须放在对应渠道的命名空间对象内：

```json
{
  "channelType": "interactive_card",
  "extraData": {
    "feishu": {
      "channelType": "interactive_card",
        "card": { ... }
    }
  }
}
```

各渠道的命名空间 key：`wecom`（企业微信群机器人）、`wecomapp`（企业微信应用）、`telegram`、`feishu`、`qqbot`
:::

| 类型 | 说明 | 典型场景 |
|-------------|------|----------|
| `post` | 富文本消息（多段落、链接、@人） | 格式丰富的内容推送 |
| `interactive_card` | 交互式卡片（完整卡片 JSON） | 自定义布局的复杂卡片交互 |
| `image` | 图片消息（image_key 或 Base64） | 发送图片、截图 |
| `share_chat` | 群名片分享 | 分享群聊邀请 |

::: tip 使用方式
特有消息类型需要在 API 请求中通过 `extraData[namespace].channelType` 指定类型，同时在同一命名空间内携带该类型的结构化数据。
:::

#### post 富文本消息

支持多段落、超链接、@人等富文本元素：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "项目更新通知",
    "content": "项目有新的更新，请查看详情",
    "type": "text",
    "extraData": {
      "feishu": {
        "channelType": "post",
        "title": "项目更新通知",
        "content": [
          [
            { "tag": "text", "text": "项目有新的更新：" }
          ],
          [
            { "tag": "a", "text": "查看详情", "href": "https://example.com/update" }
          ]
        ]
      }
    }
  }'
```

**extraData 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | String | 否 | 消息标题（最长 128 字符） |
| content | Array | 是 | 内容段落数组，每段为一个元素数组 |

**content 元素格式**：

| tag 类型 | 必填字段 | 说明 |
|----------|----------|------|
| `text` | text | 纯文本 |
| `a` | text, href | 超链接 |
| `at` | user_id | @某人（user_id 为飞书用户 ID） |

#### interactive_card 交互式卡片

发送完整的飞书卡片 JSON 对象，支持自定义 header、elements、actions：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统通知",
    "content": "服务器状态：正常运行，CPU使用率：45%",
    "type": "text",
    "extraData": {
      "feishu": {
        "channelType": "interactive_card",
        "card": {
          "header": {
            "title": { "tag": "plain_text", "content": "系统通知" },
            "template": "blue"
          },
          "elements": [
            {
              "tag": "div",
              "text": { "tag": "lark_md", "content": "**服务器状态**: 正常运行\n**CPU使用率**: 45%" }
            },
            {
              "tag": "action",
              "actions": [
                { "tag": "button", "text": { "tag": "plain_text", "content": "查看详情" }, "url": "https://example.com", "type": "primary" }
              ]
            }
          ]
        }
      }
    }
  }'
```

**extraData 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| card | Object | 是 | 完整的飞书卡片 JSON 对象（含 header 和 elements） |

> 详细卡片结构请参考 [飞书官方卡片文档](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot#%E5%8D%A1%E7%89%87%E6%B6%88%E6%81%AF)。

#### image 图片消息

支持两种方式：通过 `image_key`（已上传的图片）或 `base64`（Base64 编码）：

```bash
# 方式一：使用 image_key
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "截图分享",
    "content": "请查看分享的图片",
    "type": "text",
    "extraData": {
      "feishu": {
        "channelType": "image",
        "image_key": "img_v2_xxxx"
      }
    }
  }'

# 方式二：使用 Base64 编码
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "验证码图片",
    "content": "您的验证码已发送，请查收图片",
    "type": "text",
    "extraData": {
      "feishu": {
        "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD..."
      }
    }
  }'
```

**extraData 字段说明**（二选一）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_key | String | 条件必填 | 通过飞书上传接口获取的图片 key（与 base64 二选一） |
| base64 | String | 条件必填 | 图片 Base64 编码字符串（与 image_key 二选一） |

#### share_chat 群名片分享

分享群聊电子名片，方便成员快速加入群组：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "群聊邀请",
    "content": "邀请您加入项目交流群",
    "type": "text",
    "extraData": {
      "feishu": {
        "channelType": "share_chat",
        "share_chat_id": "oc_xxxxxxxx"
      }
    }
  }'
```

**extraData 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| share_chat_id | String | 是 | 目标群聊的 open_chat_id |


---

## 技术细节

### 消息长度限制

- 文本消息：最长不超过 **5000 字符**
- 卡片消息：最长不超过 **5000 字符**

### 请求体大小限制

- 请求体数据大小不能超过 **20 KB**

### 频率限制

飞书自定义机器人限制（单租户单机器人）：
- **100 次/分钟**
- **5 次/秒**

> ⚠️ 建议避开整点及半点时间发送，避免触发系统限流。

### 签名机制

如果配置了签名校验，MagicPush 会自动：
1. 使用当前时间戳 + Secret 计算 HMAC-SHA256 签名
2. 将 `timestamp` 和 `sign` 字段附加到请求 Body 中
3. 发送签名后的请求

你无需手动处理签名，MagicPush 已自动完成。

---

## 常见问题

### Q: 发送消息返回 `19001` 错误码？

**原因**：Webhook 地址无效或已过期。

**解决**：
1. 检查 Webhook 地址是否完整复制
2. 确认地址以 `https://open.feishu.cn/open-apis/bot/v2/hook/` 开头
3. 重新从飞书机器人详情页复制 Webhook 地址
4. 如果机器人被删除后重新创建，需要更新 Webhook 地址

### Q: 发送消息返回 `19002` 错误码？

**原因**：签名校验失败。

**解决**：
1. 确认 Secret 填写正确，没有多余空格
2. 确认飞书机器人设置中是否启用了签名校验
3. 如果未启用签名校验，将 Secret 字段留空

### Q: 发送消息返回频率限制错误？

**原因**：触发了频率限制（100 次/分钟 或 5 次/秒）。

**解决**：
1. 降低推送频率，合并消息
2. 创建多个机器人分散推送

### Q: Markdown 消息没有正确渲染为卡片？

**原因**：飞书的卡片消息有特定的格式要求。

**解决**：
1. 确保 `type` 参数设置为 `markdown`
2. MagicPush 会自动将 Markdown 转换为飞书卡片格式
3. 如果内容包含特殊字符，确保正确转义

### Q: 如何发送到多个群？

**解决**：每个飞书群需要单独添加一个自定义机器人，每个机器人对应一个 MagicPush 渠道。

---

## 参考资源

- [飞书自定义机器人官方文档](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
