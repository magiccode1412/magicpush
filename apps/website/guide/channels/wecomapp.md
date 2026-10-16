---
title: 企业微信应用推送渠道配置指南
description: 通过企业微信自建应用实现个人/全员消息推送的完整配置教程
outline: deep
---

# 企业微信应用推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置**企业微信应用消息**推送渠道，实现向指定成员或全员推送消息。

::: warning 使用必看
创建企业微信自建应用并正常调用 API，需要满足以下条件：

- **域名备案要求**：需要有固定IP地址；应用必须绑定已备案的域名，且**备案主体需与企业主体一致或有强关联关系**
- 如果不具备上述条件（如使用海外服务器、无备案域名等），建议改用 **[企业微信群机器人](./wecom)** 渠道，仅需一个 Webhook Key 即可使用
:::

## 概述

### 什么是企业微信应用推送？

企业微信应用消息推送是通过在企业微信管理后台创建**自建应用**，调用企业微信开放 API 向指定成员发送消息的能力。

**渠道特性**：

| 特性 | 说明 |
|------|------|
| 推送目标 | **个人** / 部门 / 标签 / 全员 |
| 鉴权方式 | access_token（动态刷新，7200秒有效期） |
| 配置复杂度 | 需要 corpid + corpsecret + agentid |
| 支持消息类型 | 文本消息、**markdown 消息**、图文消息、图片消息、视频消息、文件消息、语音消息、mpnews 图文消息、文本卡片消息、模板卡片消息、小程序通知消息 |
| 适用场景 | 个人通知、告警推送、系统通知 |
| 频率限制 | ~30次/分钟/人 |

### 前置条件

- 拥有企业微信管理员权限（或管理员协助创建应用）
- 已部署并登录 MagicPush 管理后台
- 接收消息的成员需要在企业微信应用的**可见范围**内

---

## 第一步：在企业微信管理后台准备配置信息

### 1.1 登录企业微信管理后台

访问 [企业微信管理后台](https://work.weixin.qq.com/)，使用管理员账号登录。

### 1.2 获取企业 ID（corpid）

1. 登录后，在左侧导航栏点击「**我的企业**」
2. 在页面底部找到「**企业信息**」板块
3. 复制「**企业 ID**」字段的值

![企业ID获取位置示意]

> 企业 ID（corpid）是企业的唯一标识符，格式类似 `ww1234567890abcdef`。

### 1.3 创建或选择自建应用

1. 在左侧导航栏点击「**应用管理**」→「**应用**」
2. 点击「**创建应用**」按钮（或选择一个已有应用）
3. 填写应用基本信息：
   - **应用名称**：如「MagicPush 通知」
   - **应用 logo**：可上传自定义图标
   - **应用介绍**：可填写「消息推送通知服务」
4. 点击「**创建应用**」

### 1.4 配置应用可见范围

> ⚠️ **重要**：只有可见范围内的成员才能收到消息，务必配置正确。

1. 在应用详情页，找到「**可见范围**」设置项
2. 点击「**设置**」，选择需要接收推送的成员、部门或标签
3. 保存设置

### 1.5 获取 AgentId 和 Secret

1. 在应用详情页的顶部，可以找到「**AgentId**」，记录这个数字
2. 在「**Secret**」区域，点击「**查看**」按钮
3. 使用管理员手机扫码后，即可看到并复制 Secret 值

> 🔐 Secret 是敏感凭证，请妥善保管。每个应用的 Secret 独立，且仅显示一次，如果忘记需要重置。

至此，你已获得配置所需的三项关键信息：

| 配置项 | 示例值 | 来源 |
|--------|--------|------|
| corpid | `ww1234567890abcdef` | 我的企业 → 企业 ID |
| corpsecret | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | 应用详情 → Secret |
| agentid | `1000002` | 应用详情 → AgentId |

### 1.6 确认接收成员的 UserID

接收消息的成员需要在企业的通讯录中。获取成员 ID 的方法：

1. 在管理后台点击「**通讯录**」
2. 找到目标成员，点击进入详情页
3. 成员详情页的「**账号**」即为 UserID

> 💡 **提示**：如果推送全员，可以将 `touser` 设置为 `@all`；如果推送给多个成员，用 `|` 分隔，如 `zhangsan|lisi|wangwu`。

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航「**渠道管理**」
3. 点击右上角「**+ 绑定渠道**」按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择「**企业微信应用**」。

### 2.3 填写配置信息

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **企业 ID** | 企业唯一标识（corpid） | `ww1234567890abcdef` |
| **应用 Secret** | 自建应用的凭证密钥 | 点击应用详情中的「查看」获取 |
| **应用 AgentId** | 企业应用 ID（整型数字） | `1000002` |
| **接收成员** | 成员 UserID（多个用 `\|` 分隔）或 `@all` | `zhangsan` 或 `zhangsan\|lisi` 或 `@all` |
| **代理地址**（可选） | 如需通过代理访问企业微信 API | `http://127.0.0.1:7890` |

填写完成后，给渠道起一个易于辨识的**名称**（如「生产环境告警推送」），点击「**保存**」。

### 2.4 测试连通性

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击「**测试**」按钮。

- ✅ 如果企业微信客户端收到「这是一条来自魔法推送的测试消息」，说明配置成功
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
| `text` | 纯文本消息（默认） |
| `markdown` | Markdown 格式消息（支持标题、加粗、链接、行内代码、引用、字体颜色） |
| `html` | HTML 格式（通道会自动转换为纯文本） |

### 3.2 Markdown 消息示例

企业微信应用支持以下 Markdown 语法：

```markdown
## 系统告警通知
您的会议室已经预定，稍后会同步到`邮箱`

> **事项详情**
> 会议室：<font color="info">广州TIT 1楼 301</font>
> 时间：2024-06-01 14:00-15:00

请点击 [查看详情](https://example.com) 了解会议议程
```

支持的格式：
- 标题（`#` ~ `######`）
- 加粗（`**text**`）
- 链接（`[text](url)`）
- 行内代码（`` `code` ``）
- 引用（`> text`）
- 字体颜色：`<font color="info">绿色</font>`、`<font color="comment">灰色</font>`、`<font color="warning">橙红色</font>`

### 3.3 特有消息类型

除了通用的 `text`、`markdown` 和 `html` 类型外，企业微信应用还支持以下**特有消息类型**，通过 `extraData` 参数发送：

::: tip 命名空间隔离
extraData 采用**命名空间隔离 + 类型自包含**设计，`channelType` 必须放在对应渠道的命名空间对象内：

```json
{
  "channelType": "image",
  "extraData": {
    "wecomapp": {
      "url": "https://example.com/img.png"
    }
  }
}
```

各渠道的命名空间 key：`wecom`（企业微信群机器人）、`wecomapp`（企业微信应用）、`telegram`、`feishu`、`qqbot`
:::

| 类型 | 说明 | 典型场景 |
|-------------|------|----------|
| `news` | 图文消息（多条图文链接文章） | 资讯推送、公告通知、产品发布 |
| `text_card` | 文本卡片（带标题和跳转链接） | 审批通知、简短提醒 |
| `template_card` | 模板卡片（交互式卡片） | 告警通知、任务提醒、数据报告 |
| `image` | 图片消息（支持 media_id / Base64 / URL 上传） | 截图分享、验证码图片 |
| `file` | 文件消息（支持 media_id / Base64 / URL 上传） | 发送报表、PDF 文档 |
| `voice` | 语音消息（支持 media_id / Base64 / URL 上传，AMR 格式） | 语音通知、语音播报 |
| `video` | 视频消息（支持 media_id / Base64 / URL 上传，MP4 格式） | 视频演示、操作教程 |
| `mpnews` | 图文消息 mpnews（支持富文本 HTML 正文，封面图支持 media_id / URL / Base64 上传） | 富文本资讯推送、图文详情页 |
| `miniprogram_notice` | 小程序通知消息（可跳转小程序页面） | 订单状态更新、服务通知 |

::: tip 使用方式
特有消息类型需要在 API 请求中通过 `extraData[namespace].channelType` 指定类型，同时在同一命名空间内携带该类型的结构化数据。对于图片、文件、语音、视频以及 **mpnews 封面图**类型的消息，**支持三种数据源**（按优先级排序）：

1. **`media_id`** / **`thumb_media_id`** — 已上传过的素材 ID，直接使用，**跳过重新上传**
2. **`base64`** / **`thumb_base64`** — Base64 编码字符串，后端自动解码后上传至企业微信
3. **`url`** / **`thumb_url`** — 公网可访问的资源 URL，**后端自动下载后上传**

三者至少提供一种即可。推荐优先使用 `media_id` 或 `url`，避免在请求体中传输大量 Base64 数据。
:::

#### news 图文消息

适用于展示带封面图的多条图文资讯：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统升级公告",
    "content": "系统将于今晚22:00-23:00进行升级维护",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "channelType": "news",
        "articles": [
          {
            "title": "系统升级公告",
            "description": "系统将于今晚22:00-23:00进行升级维护",
            "url": "https://example.com/notice",
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
| articles | Array | 是 | 文章数组 |
| articles[].title | String | 是 | 文章标题（最长 128 字符） |
| articles[].description | String | 否 | 文章描述（最长 512 字符） |
| articles[].url | String | 否 | 点击跳转链接 |
| articles[].picurl | String | 否 | 封面图 URL |

#### text_card 文本卡片

适用于审批通知等需要点击跳转的简短消息：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "审批通知",
    "content": "您有一条新的审批待处理，请及时查看",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "title": "审批通知",
        "description": "您有一条新的审批待处理，请及时查看",
        "url": "https://example.com/approval",
        "btntxt": "查看详情"
      }
    }
  }'
```

**extraData 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | String | 是 | 卡片标题（最长 128 字符） |
| description | String | 否 | 卡片描述文本（最长 512 字符） |
| url | String | 否 | 点击按钮后的跳转链接 |
| btntxt | String | 否 | 按钮文字（默认"详情"，最长 16 字符） |

#### template_card 模板卡片

支持三种样式的交互式卡片：文本通知、图文通知、按钮互动：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统升级通知",
    "content": "系统将于今晚22:00-23:00进行升级维护",
    "type": "text",
    "extraData": {
      "wecomapp": {
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
| source | Object | 否 | 来源信息 `{ desc_text: "描述" }` |
| main_title | Object | 否 | 主标题 `{ title: "内容" }` |
| sub_title_text | String | 否 | 副标题（最长 256 字符） |
| horizontal_content_list | Array | 否 | 键值对列表 `[{ keyname, value }]` |
| card_action | Object | 否 | 操作按钮 `{ url, type }` |
| task_list | Array | 否 | 任务列表（button_interaction 类型常用） |
| card_selection | Object | 否 | 选择器配置 |

#### image 图片消息

支持三种方式发送图片（MagicPush 会自动处理上传）：

**方式一：使用 URL（推荐）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "服务器截图",
    "content": "服务器 CPU 使用率超过 90%，请查看截图",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "url": "https://example.com/screenshot.jpg",
        "filename": "screenshot.jpg"
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
    "title": "服务器截图",
    "content": "服务器 CPU 使用率超过 90%，请查看截图",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
        "filename": "screenshot.jpg"
      }
    }
  }'
```

**方式三：使用已有 media_id（跳过上传，最快）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "服务器截图",
    "content": "服务器 CPU 使用率超过 90%",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "media_id": "MEDIA_ID_xxx"
      }
    }
  }'
```

**extraData 字段说明（三选一）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| media_id | String | 条件必填* | 已上传过的素材 ID，填此字段可跳过重新上传 |
| url | String | 条件必填* | 公网可访问的图片 URL，后端自动下载后上传 |
| base64 | String | 条件必填* | 图片的 Base64 编码字符串（不含 data:image 前缀） |
| filename | String | 否 | 文件名（如 `photo.jpg`） |

\* `media_id`、`url`、`base64` 三者至少提供一种。优先推荐 `media_id` 或 `url`。

#### file 文件消息

支持三种方式发送文件（MagicPush 会自动处理上传）：

**方式一：使用 URL（推荐）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "月度报告",
    "content": "请查收2024年第一季度月度报告",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "url": "https://example.com/report.pdf",
        "filename": "report.pdf"
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
    "title": "月度报告",
    "content": "请查收2024年第一季度月度报告",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "base64": "JVBERi0xLjQK...",
        "filename": "report.pdf"
      }
    }
  }'
```

**方式三：使用已有 media_id（跳过上传，最快）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "月度报告",
    "content": "请查收报告",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "media_id": "MEDIA_ID_xxx"
      }
    }
  }'
```

**extraData 字段说明（三选一）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| media_id | String | 条件必填* | 已上传过的素材 ID，填此字段可跳过重新上传 |
| url | String | 条件必填* | 公网可访问的文件 URL，后端自动下载后上传 |
| base64 | String | 条件必填* | 文件的 Base64 编码字符串 |
| filename | String | 否 | 文件名（如 `report.pdf`） |

\* `media_id`、`url`、`base64` 三者至少提供一种。优先推荐 `media_id` 或 `url`。

#### voice 语音消息

支持三种方式发送语音（MagicPush 会自动处理上传）：

**方式一：使用 URL（推荐）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "语音通知",
    "content": "请查收语音消息",
    "type": "text",
    "extraData": {
      "wecomapp": {
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
    "content": "请查收语音消息",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
        "filename": "voice.amr"
      }
    }
  }'
```

**方式三：使用已有 media_id**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "语音通知",
    "content": "请查收语音消息",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "media_id": "MEDIA_ID_xxx"
      }
    }
  }'
```

**extraData 字段说明（三选一）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| media_id | String | 条件必填* | 已上传过的素材 ID，填此字段可跳过重新上传 |
| url | String | 条件必填* | 公网可访问的语音文件 URL，后端自动下载后上传 |
| base64 | String | 条件必填* | 语音的 Base64 编码字符串（AMR 格式） |
| filename | String | 否 | 文件名（如 `voice.amr`） |

\* `media_id`、`url`、`base64` 三者至少提供一种。优先推荐 `media_id` 或 `url`。

> ⚠️ **注意**：语音文件仅支持 AMR 格式，文件大小不超过 **2MB**，播放时长不超过 **60秒**。

#### video 视频消息

支持三种方式发送视频（MagicPush 会自动处理上传）：

**方式一：使用 URL（推荐）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "产品演示视频",
    "content": "最新版本功能演示，请查看视频",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "url": "https://example.com/demo.mp4",
        "filename": "demo.mp4",
        "title": "产品演示视频",
        "description": "V2.0 新功能演示"
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
    "title": "产品演示视频",
    "content": "最新版本功能演示，请查看视频",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
        "filename": "demo.mp4",
        "title": "产品演示视频",
        "description": "V2.0 新功能演示"
      }
    }
  }'
```

**方式三：使用已有 media_id**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "产品演示视频",
    "content": "请查看视频",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "media_id": "MEDIA_ID_xxx",
        "title": "产品演示视频",
        "description": "V2.0 新功能演示"
      }
    }
  }'
```

**extraData 字段说明（三选一）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| media_id | String | 条件必填* | 已上传过的素材 ID，填此字段可跳过重新上传 |
| url | String | 条件必填* | 公网可访问的视频文件 URL，后端自动下载后上传 |
| base64 | String | 条件必填* | 视频的 Base64 编码字符串（MP4 格式） |
| filename | String | 否 | 文件名（如 `demo.mp4`） |
| title | String | 否 | 视频消息标题（显示在卡片上） |
| description | String | 否 | 视频消息描述文字 |

\* `media_id`、`url`、`base64` 三者至少提供一种。优先推荐 `media_id` 或 `url`。

> ⚠️ **注意**：视频文件仅支持 MP4 格式，文件大小不超过 **10MB**。

#### mpnews 图文消息

与普通 news 不同，mpnews 支持富文本正文内容（HTML），**封面图支持三种数据源自动上传**（与图片消息类似）：

**方式一：使用 thumb_url（推荐）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统升级公告",
    "content": "系统将于今晚22:00-23:00进行升级维护",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "channelType": "mpnews",
        "articles": [
          {
            "title": "系统升级公告",
            "thumb_url": "https://example.com/cover.jpg",
            "author": "运维团队",
            "content": "<h3>系统将于今晚升级</h3><p>预计维护时间：22:00-23:00</p><p>影响范围：所有用户</p>",
            "content_source_url": "https://example.com/notice",
            "digest": "系统升级通知摘要"
          }
        ]
      }
    }
  }'
```

**方式二：使用 thumb_base64**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统升级公告",
    "content": "系统将于今晚22:00-23:00进行升级维护",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "channelType": "mpnews",
        "articles": [
          {
            "title": "系统升级公告",
            "thumb_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
            "thumb_filename": "cover.jpg",
            "author": "运维团队",
            "content": "<h3>系统将于今晚升级</h3><p>预计维护时间：22:00-23:00</p><p>影响范围：所有用户</p>",
            "content_source_url": "https://example.com/notice",
            "digest": "系统升级通知摘要"
          }
        ]
      }
    }
  }'
```

**方式三：使用已有 thumb_media_id（跳过上传，最快）**

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统升级公告",
    "content": "系统将于今晚22:00-23:00进行升级维护",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "channelType": "mpnews",
        "articles": [
          {
            "title": "系统升级公告",
            "thumb_media_id": "MEDIA_ID_xxxx",
            "author": "运维团队",
            "content": "<h3>系统将于今晚升级</h3><p>预计维护时间：22:00-23:00</p><p>影响范围：所有用户</p>",
            "content_source_url": "https://example.com/notice",
            "digest": "系统升级通知摘要"
          }
        ]
      }
    }
  }'
```

**articles[].extraData 字段说明（封面图三选一）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| articles | Array | 是 | 文章数组 |
| articles[].title | String | 是 | 文章标题（最长 512 字符） |
| articles[].thumb_media_id | String | 条件必填* | 已上传过的封面素材 ID，填此字段可跳过重新上传 |
| articles[].thumb_url | String | 条件必填* | 公网可访问的封面图 URL，后端自动下载后上传 |
| articles[].thumb_base64 | String | 条件必填* | 封面图的 Base64 编码字符串（不含 data:image 前缀） |
| articles[].thumb_filename | String | 否 | 封面图文件名（如 `cover.jpg`，默认 `thumb.jpg`） |
| articles[].author | String | 否 | 作者名称 |
| articles[].content | String | 是 | 正文 HTML 内容（支持完整 HTML 标签） |
| articles[].content_source_url | String | 否 | 阅读原文 URL |
| articles[].digest | String | 否 | 摘要文本（最长 120 字符） |

\* `thumb_media_id`、`thumb_url`、`thumb_base64` 三者至少提供一种。优先推荐 `thumb_media_id` 或 `thumb_url`。

:::: tip 与 news 的区别
`news` 类型适合简单的图文链接列表，而 `mpnews` 支持完整的富文本 HTML 正文内容，展示效果更丰富。现在 mpnews 的封面图已支持 **URL / Base64 自动上传**，无需预先手动获取 `thumb_media_id`，使用门槛大幅降低。
::::

#### miniprogram_notice 小程序通知消息

发送小程序通知卡片，点击可跳转至指定小程序页面：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "订单状态更新",
    "content": "您的订单已发货",
    "type": "text",
    "extraData": {
      "wecomapp": {
        "appid": "wxa1234567890abcdef",
        "page": "pages/order/detail?orderId=12345",
        "title": "订单状态更新",
        "description": "您的订单已发货",
        "emphasis_first_item": true,
        "content_items": [
          { "key": "订单号", "value": "ORD-20240115-001" },
          { "key": "状态", "value": "已发货" },
          { "key": "快递公司", "value": "顺丰速运" }
        ]
      }
    }
  }'
```

**extraData 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appid | String | 是 | 小程序 AppID（必须是已关联到企业的应用） |
| page | String | 是 | 小程序页面路径（如 `pages/index/index`） |
| title | String | 否 | 通知标题（最长 32 字符；不填则使用 content_items 第一项 key） |
| description | String | 否 | 描述文字（最长 128 字符） |
| emphasis_first_item | Boolean | 否 | 是否放大显示 content_items 第一项（默认 true） |
| content_items | Array | 否 | 键值对列表 `[{key, value}]`（最多 10 项） |
| content_items[].key | String | 是 | 键名（最长 20 字符） |
| content_items[].value | String | 是 | 值（最长 30 字符） |

> 💡 **提示**：使用前需要在企业微信管理后台将对应的小程序应用关联到企业，并确保用户有权限访问该小程序。


---

## 技术细节

### access_token 管理

MagicPush 自动管理 access_token 的生命周期：

1. **获取**：首次发送消息时自动通过 corpid + corpsecret 获取
2. **缓存**：token 缓存在内存中，有效期为 7200 秒（2 小时）
3. **刷新**：提前 5 分钟自动刷新，避免过期
4. **容错**：如果发送时发现 token 失效（errcode 42001 或 40014），自动清除缓存并重新获取

服务重启后 token 缓存会丢失，首次发送时会自动重新获取，无需人工干预。

### 媒体上传机制

对于图片、文件、语音、视频类型的消息，MagicPush 的上传流程如下：

1. **`media_id`**：直接使用已有素材 ID，跳过上传步骤
2. **`url` 模式**：后端通过 HTTP GET 下载远程资源（支持代理），将响应内容转为 Buffer 后通过 `multipart/form-data` 上传至企业微信 `/cgi-bin/media/upload` 接口
3. **`base64` 模式**：后端将 Base64 字符串解码为 Buffer 后上传

> ⚠️ **注意**：使用 `url` 方式时，目标 URL 必须是公网可访问的地址。下载超时时间为 30 秒。如果服务器配置了代理，下载过程会自动走代理通道。

### 频率限制

企业微信 API 有以下限制，请注意合理使用：

- 每应用不可超过 `账号上限数 × 200` 人次/天
- 每应用对同一成员不可超过 **30 次/分钟**
- 同一成员不可超过 **1000 次/小时**

MagicPush 不会对频率做额外限制，请确保推送频率在企业微信允许的范围内。

### 消息长度限制

- 文本消息：最长不超过 **2048 字节**
- Markdown 消息：最长不超过 **2048 字节**
- 微信端微工作台（在微信里接收）：仅支持文本消息，且长度限制为 **20 字节**（约 6-7 个中文字）

---

## 常见问题

### Q: 发送消息返回 `invaliduser` 错误？

**原因**：指定的 UserID 不存在，或该用户不在应用的可见范围内。

**解决**：
1. 确认成员的 UserID 是否正确（区分大小写）
2. 在应用详情中检查「可见范围」是否包含该成员
3. 如果该成员是新加入企业的，需要先在通讯录中添加

### Q: 发送消息返回 `60011`（没有权限）？

**原因**：该应用没有足够的权限。

**解决**：到应用管理后台确认应用已启用，并检查是否有人员推送的限制。

### Q: 测试消息显示"获取 access_token 失败"？

**原因**：corpid 或 corpsecret 填写错误。

**解决**：
1. 确认 corpid 是「我的企业」页面中的企业 ID，不是应用 ID
2. 确认 corpsecret 是应用详情中显示的 Secret，不要有多余的空格或换行
3. 如果 corpid 和 corpsecret 正确但仍失败，检查服务器是否可以访问 `qyapi.weixin.qq.com`

### Q: Markdown 消息不支持列表、图片、表格？

**原因**：企业微信应用消息的 Markdown 仅支持其定义的**语法子集**。

**解决**：请参考上方 [Markdown 消息示例](#markdown-消息示例) 中的支持语法。不支持的元素（列表、图片、表格）不会渲染。

### Q: 微信里收到的消息不完整？

**原因**：微工作台（微信端）的文本消息长度限制为 20 字节。

**解决**：
- 推荐使用企业微信客户端查看完整消息
- 如果必须推送微信端，消息内容应控制在 6-7 个中文字以内
- 可以考虑使用 `markdown` 类型代替纯文本（微信端可能渲染不同）

### Q: 代理怎么配置？

如果你的服务器 IP 不固定，需要通过代理访问企业微信 API：

```javascript
// 在渠道配置中填写代理地址字段
{
  "proxyUrl": "http://127.0.0.1:7890"
}
```

支持的代理协议：`http://`、`https://`、`socks4://`、`socks5://`

### Q: 什么时候应该选择本渠道？

| 场景 | 说明 |
|------|------|
| 需要推送到**个人**，每个人独立接收 | ✅ 本渠道支持 |
| 需要通知企业**全员** | ✅ 设置 touser 为 @all |
| 需要推送到部门或标签分组 | ✅ 本渠道支持 |
| 需要较高的消息频率（~30次/分钟/人） | ✅ 本渠道支持 |

---

## 参考资源

- [企业微信开发者中心](https://developer.work.weixin.qq.com/)
- [企业微信管理后台](https://work.weixin.qq.com/)
- [获取 access_token API 文档](https://developer.work.weixin.qq.com/document/path/91039)
- [发送应用消息 API 文档](https://developer.work.weixin.qq.com/document/path/90236)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
