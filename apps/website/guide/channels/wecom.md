---
title: 企业微信群机器人推送渠道配置指南
description: 通过企业微信群机器人实现群聊消息推送的完整配置教程
outline: deep
---

# 企业微信群机器人推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置**企业微信群机器人**推送渠道，实现向企业微信群聊发送文本和 Markdown 消息。

## 概述

### 什么是企业微信群机器人？

企业微信群机器人是企业微信内置的群聊机器人功能，可以在群中自动发送消息通知。

**渠道特性**：

| 特性 | 说明 |
|------|------|
| 推送目标 | **群聊** |
| 鉴权方式 | **Webhook Key（静态）** |
| 配置复杂度 | **仅需一个 Key** |
| 支持消息类型 | **文本**、**Markdown** / **Markdown（增强版）**、图片、图文、文件、语音、模板卡片 |
| 适用场景 | 群内通知、团队协作 |
| 频率限制 | **20条/分钟/机器人** |

### 前置条件

- 拥有企业微信账号，且是某个群的管理员或群成员
- 已部署并登录 MagicPush 管理后台

---

## 第一步：在企业微信群中获取机器人 Key

### 1.1 添加群机器人

1. 打开企业微信，进入需要添加机器人的**群聊**
2. 点击右上角 **「···」** 菜单按钮
3. 在菜单中找到并点击 **「消息推送」**
4. 点击 **「添加机器人」** → **「新建机器人」**
5. 填写机器人信息：
   - **机器人名称**：如 `MagicPush 通知`
   - **简介**：如 `用于接收 MagicPush 推送的通知`
6. 点击 **「添加」**

### 1.2 获取机器人 Key

添加成功后，会弹出机器人详情页面，其中包含 **Webhook 地址**：

```
https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> 📌 **关键信息**：URL 中 `key=` 后面的部分就是机器人 Key，也可以直接复制完整 Webhook 地址填入 MagicPush。

你可以：
- **方式一**：只复制 `key=` 后面的字符串（如 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）
- **方式二**：复制完整 Webhook 地址（MagicPush 会自动识别）

> 💡 **提示**：如果关闭了详情页面，可以在群聊中 @机器人 → 查看详情 → 复制 Webhook 地址重新获取。

至此，你已获得配置所需的信息：

| 配置项 | 示例值 | 来源 |
|--------|--------|------|
| 机器人 Key | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | 群机器人详情页 Webhook 地址中 |
| 或完整 Webhook 地址 | `https://qyapi.weixin.qq.com/...` | 同上 |

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择 **「企业微信群机器人」**。

### 2.3 填写配置信息

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **机器人 Key** | 机器人 Webhook Key 或完整 Webhook 地址 | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` 或完整 URL |

> 💡 **提示**：MagicPush 支持两种填写方式：
> - 只填写 Key 字符串（推荐，更简洁）
> - 填写完整 Webhook URL（自动解析 Key）

填写完成后，给渠道起一个易于辨识的**名称**（如「运维告警群」），点击 **「保存」**。

### 2.4 测试连通性

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果企业微信群中收到「这是一条来自魔法推送的测试消息」，说明配置成功
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
    "type": "markdown"
  }'
```

支持的消息类型（`type` 参数）：

| type 值 | 说明 |
|---------|------|
| `text` | **文本消息**（默认） |
| `markdown` | **Markdown 格式消息** |
| `html` | **HTML 格式消息**（MagicPush 自动剥离标签转为纯文本发送） |

### 3.2 Markdown 消息示例

企业微信群机器人支持以下 Markdown 语法：

```markdown
## 系统告警通知

**告警级别**：<font color="warning">高</font>

> 服务器：192.168.1.100
> CPU使用率：95%
> 时间：2024-06-01 14:00

请立即处理！
```

支持的格式：
- 标题（`#` ~ `######`）
- 加粗（`**text**`）
- 字体颜色：`<font color="info">绿色</font>`、`<font color="comment">灰色</font>`、`<font color="warning">橙红色</font>`
- 引用（`> text`）
- 换行（`\n`）

> ⚠️ **注意**：企业微信群机器人的 Markdown 是语法子集，不支持链接、图片、列表等元素。

### 3.3 特有消息类型

除了通用的 `text` 和 `markdown` 类型外，企业微信群机器人还支持以下**特有消息类型**，通过 `extraData` 参数发送：

::: tip 命名空间隔离
extraData 采用**命名空间隔离 + 类型自包含**设计，`channelType` 必须放在对应渠道的命名空间对象内：

```json
{
  "channelType": "image",
  "extraData": {
    "wecom": {
      "url": "https://example.com/img.png"
    }
  }
}
```

各渠道的命名空间 key：`wecom`（企业微信群机器人）、`wecomapp`（企业微信应用）、`telegram`、`feishu`、`qqbot`
:::

| 类型 | 说明 | 典型场景 |
|-------------|------|----------|
| `news` | **图文消息**（带封面图和跳转链接） | 资讯推送、公告通知、活动宣传 |
| `image` | **图片消息**（Base64 或 URL 内联发送） | 发送截图、验证码图片等 |
| `file` | **文件消息**（需上传获取 media_id，≤20MB） | 发送报告、Excel 等文件 |
| `voice` | **语音消息**（需上传获取 media_id，AMR 格式） | 发送语音通知（≤60秒） |
| `markdown_v2` | **Markdown增强版**（支持表格、列表、代码块） | 周报汇报、数据报告、格式化通知 |
| `template_card` | **模板卡片**（交互式） | 告警卡片、任务通知、审批提醒 |

::: tip 使用方式
特有消息类型需要在 API 请求中通过 `extraData[namespace].channelType` 指定类型，同时在同一命名空间内携带该类型的结构化数据。

对于图片、文件、语音类型的消息，**支持多种数据输入方式**：

- **`image` 图片**：支持 `base64`（内联到 JSON）或 `url`（后端自动下载转 Base64 后内联）
- **`file` 文件 / `voice` 语音**：只接受 `media_id` 发送，但可通过以下任一方式获取：
  - 直接提供已有的 `media_id`
  - 提供 `base64`，后端自动上传并返回 `media_id`
  - 提供 `url`，后端自动下载后上传并返回 `media_id`

推荐优先使用 `url` 方式，避免在请求体中传输大量 Base64 数据。
:::

#### news 图文消息

适用于需要展示封面图、标题描述和点击跳转链接的场景：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "中秋节礼品到",
    "content": "今年中秋公司为大家准备了精美礼品",
    "type": "text",
    "extraData": {
      "wecom": {
        "channelType": "news",
        "articles": [
          {
            "title": "中秋节礼品到",
            "description": "今年中秋公司为大家准备了精美礼品",
            "url": "https://example.com/gift",
            "picurl": "https://picsum.photos/600/300"
          }
        ]
      }
    }
  }'
```

**extraData 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| articles | Array | 是 | 文章数组（支持多条） |
| articles[].title | String | 是 | 文章标题（最长 128 字符） |
| articles[].description | String | 否 | 文章描述（最长 512 字符） |
| articles[].url | String | 否 | 点击后跳转的链接地址 |
| articles[].picurl | String | 否 | 封面图 URL |

#### image 图片消息

群机器人图片支持在 JSON 中直接内联 Base64 数据，也支持通过 URL 自动下载：

**方式一：使用 URL（推荐）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "验证码图片",
    "content": "您的验证码已发送，请查收图片",
    "type": "text",
    "extraData": {
      "wecom": {
        "channelType": "image",
        "url": "https://example.com/captcha.png"
      }
    }
  }'
```

**方式二：使用 Base64**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "验证码图片",
    "content": "您的验证码已发送，请查收图片",
    "type": "text",
    "extraData": {
      "wecom": {
        "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      }
    }
  }'
```

**extraData 字段说明（二选一）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | String | 条件必填* | 公网可访问的图片 URL，后端自动下载后转 Base64 内联 |
| base64 | String | 条件必填* | 图片的 Base64 编码字符串（不含 `data:image` 前缀） |
| md5 | String | 否 | 图片内容的 MD5 值（可选校验用） |

\* `url` 和 `base64` 二者至少提供一种。

#### file 文件消息

> ⚠️ **注意**：群机器人文件类型**不支持** Base64 内联，必须通过上传获取 `media_id` 后发送。MagicPush 会自动处理上传流程。

支持三种方式（三选一）：

**方式一：使用 URL（推荐）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "月度报表",
    "content": "请查收本月度报表文件",
    "type": "text",
    "extraData": {
      "wecom": {
        "url": "https://example.com/report.pdf"
      }
    }
  }'
```

**方式二：使用 Base64**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "月度报表",
    "content": "请查收本月度报表文件",
    "type": "text",
    "extraData": {
      "wecom": {
        "base64": "JVBERi0xLjQK..."
      }
    }
  }'
```

**方式三：使用已有 media_id（跳过上传）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "月度报表",
    "content": "请查收报表",
    "type": "text",
    "extraData": {
      "media_id": "@lALdD..."
    }
  }'
```

**extraData 字段说明（三选一）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| media_id | String | 条件必填* | 已上传的媒体 ID（优先使用，跳过重新上传） |
| url | String | 条件必填* | 公网可访问的文件 URL，后端自动下载后上传获取 media_id |
| base64 | String | 条件必填* | 文件的 Base64 编码字符串，后端自动上传获取 media_id |

\* 三者至少提供一种。

#### template_card 模板卡片

发送交互式模板卡片，支持文本通知、图文通知和按钮互动三种样式：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统升级通知",
    "content": "系统将于今晚22:00-23:00进行升级维护",
    "type": "text",
    "extraData": {
      "wecom": {
        "card_type": "text_notice",
        "source": { "desc_text": "来自魔法推送" },
        "main_title": { "title": "系统升级通知" },
        "sub_title_text": "系统将于今晚22:00-23:00进行升级维护",
        "horizontal_content_list": [
          { "keyname": "时间", "value": "2024-01-15 22:00-23:00" },
          { "keyname": "影响范围", "value": "所有用户" }
        ],
        "card_action": { "url": "https://example.com/notice", "type": 1 }
      }
    }
  }'
```

**extraData 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| card_type | String | 是 | 卡片类型：`text_notice` / `news_notice` / `button_interaction` |
| source | Object | 否 | 来源信息 `{ desc_text: "来源描述" }` |
| main_title | Object | 否 | 主标题 `{ title: "标题内容" }` |
| sub_title_text | String | 否 | 副标题（最长 256 字符） |
| horizontal_content_list | Array | 否 | 键值对列表 `[{ keyname, value }]` |
| card_action | Object | 否 | 操作按钮 `{ url: "跳转URL", type: 1 }` |

#### voice 语音消息

> ⚠️ **注意**：群机器人语音类型必须通过上传获取 `media_id` 后发送。MagicPush 会自动处理上传流程。

支持三种方式（三选一）：

**方式一：使用 URL（推荐）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "语音通知",
    "content": "系统告警语音已发送，请查收",
    "type": "text",
    "extraData": {
      "wecom": {
        "url": "https://example.com/voice.amr"
      }
    }
  }'
```

**方式二：使用 Base64**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "语音通知",
    "content": "系统告警语音已发送，请查收",
    "type": "text",
    "extraData": {
      "wecom": {
        "base64": "IyAgICAgICAgICAgICAg..."
      }
    }
  }'
```

**方式三：使用已有 media_id（跳过上传）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "语音通知",
    "content": "请查收语音",
    "type": "text",
    "extraData": {
      "wecom": {
        "media_id": "@lALdD..."
      }
    }
  }'
```

**extraData 字段说明（三选一）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| media_id | String | 条件必填* | 已上传的媒体 ID（优先使用，跳过重新上传） |
| url | String | 条件必填* | 公网可访问的语音文件 URL，后端自动下载后上传获取 media_id |
| base64 | String | 条件必填* | 语音的 Base64 编码字符串（AMR 格式），后端自动上传获取 media_id |

\* 三者至少提供一种。

> ⚠️ **注意**：语音文件限制：
> - 大小不超过 **2M**
> - 播放长度不超过 **60秒**
> - 格式仅支持 **AMR**
> - `media_id` 有效期为 **3天**

#### markdown_v2 Markdown增强版

发送支持表格、斜体、列表等更丰富语法的 Markdown 消息：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "周报汇总",
    "content": "本周项目进度报告",
    "type": "text",
    "extraData": {
      "wecom": {
        "content": "| 项目 | 状态 | 进度 |\n|------|------|------|\n| 任务A | 进行中 | 80% |\n| 任务B | 已完成 | 100% |\n\n- *任务A*: 开发接近尾声\n- **任务C**: 下周启动"
      }
    }
  }'
```

**extraData 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | String | 是 | Markdown_v2 内容（最长 4096 字节） |

> ⚠️ **注意**：
> - **不支持**字体颜色和 `@群成员` 语法
> - 客户端版本需 ≥ **4.1.36** 才能正常渲染，否则显示为纯文本
> - 相比普通 Markdown，额外支持：**表格、斜体、有序/无序列表、独立代码块、图片插入**


---

## 技术细节

### 消息长度限制

- 文本消息：最长不超过 **2048 字节**
- Markdown 消息：最长不超过 **4096 字节**

### 频率限制

企业微信群机器人限制：**每个机器人最多 20 条消息/分钟**。

如果发送频率超过限制，会返回错误码 `88888`。MagicPush 不会做额外限制，请注意控制推送频率。

### 媒体上传机制

对于图片、文件、语音类型的消息，MagicPush 的处理流程如下：

| 类型 | API 字段格式 | MagicPush 处理方式 |
|------|-------------|-------------------|
| **image** | `{ base64, md5 }` 内联到 JSON | `base64` 直接使用；`url` → 下载转 Base64 → 内联发送 |
| **file** | `{ media_id }` | `media_id` 直接使用；`base64`/`url` → 上传至 `webhook/upload_media` 获取 `media_id` 后发送 |
| **voice** | `{ media_id }` | 同上 |

> 💡 **说明**：群机器人的 `webhook/upload_media` 接口采用 `Content-Type: application/octet-stream` 方式上传原始文件内容。使用 `url` 方式时，后端通过 HTTP GET 下载远程资源（超时 30 秒），转为 Buffer 后上传。

### 安全注意事项

> ⚠️ **重要**：企业微信群机器人 **不提供** IP 白名单、签名验证等安全机制。
>
> 其安全性完全依赖于 **Webhook URL 的保密性**：
> - 任何人获取到 Webhook 地址即可向该群发送消息
> - 请勿将 URL 分享到 GitHub、博客等公开场所
> - 如果怀疑 URL 已泄露，建议在群中删除旧机器人并重新创建
>
> 如需更高级的安全控制（鉴权、审计日志等），可考虑使用「企业微信应用」渠道代替。

---

## 常见问题

### Q: 发送消息返回 `invalid webhook url` 错误？

**原因**：Key 或 Webhook 地址填写错误。

**解决**：
1. 检查是否复制完整，没有多余空格或换行
2. 确认使用的是企业微信的 Webhook 地址（以 `https://qyapi.weixin.qq.com` 开头），不是钉钉或飞书的地址
3. 重新从群机器人详情页复制 Webhook 地址

### Q: 发送消息返回 `rate limit` 或 `88888` 错误？

**原因**：触发了频率限制（20条/分钟）。

**解决**：
1. 降低推送频率，合并多条消息为一条
2. 如需更高频率，可以创建多个机器人分散推送

### Q: 测试消息发送成功，但 Markdown 消息没有正确渲染？

**原因**：企业微信群机器人的 Markdown 仅支持语法子集。

**解决**：请参考上方 [Markdown 消息示例](#markdown-消息示例) 中的支持语法。不支持的元素（链接、图片、表格、列表）不会渲染，建议避免使用。

### Q: 群中收不到消息，但 API 返回成功？

**原因**：可能是机器人被踢出群聊，或群聊已解散。

**解决**：
1. 在企业微信中检查机器人是否还在群成员列表中
2. 如果机器人被移除，需要重新添加

### Q: 如何发送到多个群？

**解决**：每个群需要单独创建一个群机器人，每个机器人对应一个 MagicPush 渠道。无法通过一个 Webhook 同时推送到多个群。

### Q: 什么时候应该选择本渠道？

| 场景 | 说明 |
|------|------|
| 需要推送到**群聊** | ✅ 本渠道支持 |
| 配置简单，仅需一个 Webhook Key | ✅ 本渠道支持 |
| 需要较高的消息频率（可多机器人分散） | ✅ 本渠道支持 |
| 群内通知、团队协作场景 | ✅ 本渠道适合 |

---

## 参考资源

- [企业微信群机器人配置说明](https://developer.work.weixin.qq.com/document/path/99110)
- [企业微信机器人消息格式](https://developer.work.weixin.qq.com/document/path/91770)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
