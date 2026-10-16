# 渠道特有消息类型开发指南

本文档详细说明如何为渠道适配器实现特有消息类型支持，包括特有类型的原理、接口规范、完整示例以及各渠道已实现的类型速查。

---

## 目录

- [1. 概念与动机](#1-概念与动机)
  - [1.1 通用消息类型的局限](#11-通用消息类型的局限)
  - [1.2 extraData 扩展机制与命名空间设计](#12-extradata-扩展机制与命名空间设计)
  - [1.3 数据流全景](#13-数据流全景)
- [2. 基类接口规范](#2-基类接口规范)
  - [2.1 getSupportedTypes()](#21-getsupportedtypes)
  - [2.2 getChannelSpecificTypes()](#22-getchannelspecifictypes)
  - [2.3 类型定义 Schema](#23-类型定义-schema)
- [3. 适配器改造步骤](#3-适配器改造步骤)
  - [3.1 改造 send() 方法](#31-改造-send-方法)
  - [3.2 实现 sendChannelSpecific() 路由](#32-实现-sendchannelspecific-路由)
  - [3.3 实现各类型的发送方法](#33-实现各类型的发送方法)
- [4. 完整示例：为企业微信应用添加模板卡片](#4-完整示例为企业微信应用添加模板卡片)
- [5. 已实现渠道速查表](#5-已实现渠道速查表)
- [6. 测试与验证](#6-测试与验证)
- [7. 常见问题](#7-常见问题)

---

## 1. 概念与动机

### 1.1 通用消息类型的局限

系统默认的推送 API 使用 `type` 字段指定消息格式，所有渠道共用的三种通用类型：

```javascript
{
  title: '消息标题',
  content: '消息正文',
  type: 'text'       // 仅三种: 'text' | 'markdown' | 'html'
}
```

然而，各平台原生能力远超此范围：

| 平台 | 原生支持但无法通过通用 type 表达的能力 |
|------|---------------------------------------|
| 企业微信应用 | 图文链接、文本卡片、模板卡片、图片、文件 |
| 飞书群机器人 | 富文本（多段落）、交互卡片、图片、群名片 |
| Telegram Bot | 图片、文件、地理位置 |
| 企业微信群机器人 | 图文、图片、文件、模板卡片 |

如果只用 `text` / `markdown` / `html`，这些平台特色能力完全无法触达。

### 1.2 extraData 扩展机制与命名空间设计

为了解决上述局限，系统通过 `extraData` 字段支持特有消息类型。**核心设计理念：类型与数据自包含**。

| 参数 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `type` | `string` | 通用消息格式（仅 `text`/`markdown`/`html`） | `'text'` / `'markdown'` / `'html'` |
| `extraData` | `Object` | 特有消息类型的结构化参数（可选） | 见下方示例 |

**新架构的核心规则**：

- ✅ **类型在调用时指定**: `channelType` 不再依赖渠道配置，而是直接在 `extraData` 的渠道命名空间内传入
- ✅ **类型+数据自包含**: 每个请求的 `extraData[namespace]` 既包含类型标识又包含参数数据
- ✅ **多渠道独立**: 同一个推送请求可以为不同渠道指定不同的特有类型
- ✅ **向后兼容**: 当请求中不包含 `extraData[namespace].channelType` 时，走原有的通用处理分支

**API 调用方式（新）**：

```javascript
{
  title: '服务器告警',
  content: '',
  type: 'text',  // 可忽略或任意值
  extraData: {
    qqbot: {
      channelType: 'media',       // ★ 在命名空间内指定类型
      file_type: 1,               // ★ 类型所需的参数
      url: 'https://example.com/image.png'
    },
    wecomapp: {
      channelType: 'template_card',  // ★ 不同渠道可以不同类型
      card_type: 'text_notice',
      main_title: { title: '告警' }
    }
  }
}
```

### 1.3 数据流全景

```
客户端发起推送请求 (POST /api/push)
    │
    ├── title: "标题"
    ├── content: "正文"
    ├── type: "text"                      ← 通用消息格式（可选，默认 text）
    └── extraData: {                       ← 特有类型参数（可选）
        qqbot: {
          channelType: 'media',           ← ★ 类型标识在命名空间内
          file_type: 1,
          url: '...'
        }
      }
    │
    ▼
push.service.js (推送调度引擎)
    │
    ├── 从 extraData 渠道命名空间提取 channelType  ← ★ 新逻辑
    │   const nsKey = channel.channel_type;
    │   if (extraData?.[nsKey]?.channelType) {
    │     resolvedChannelType = extraData[nsKey].channelType;
    │     resolvedExtraData = extraData[nsKey];
    │   }
    └── adapter.send({ ..., channelType: resolvedChannelType, extraData: resolvedExtraData })
            │
            ▼
        适配器 send(message) 内部:
            │
            ├── 有 channelType?           ★ 从 extraData 动态获取的类型
            │   └── YES → this.sendChannelSpecific(channelType, myExtraData)
            │               │
            │               ├── case 'media':      → sendMedia(extraData)
            │               ├── case 'news':      → sendNews(extraData)
            │               ├── case 'template_card': → sendTemplateCard(extraData)
            │               └── ...               → 对应的专属发送方法
            │
            └── NO（普通消息）?
                └── 原有 text/markdown/html 处理逻辑
```

---

## 2. 基类接口规范

`BaseChannel`（`base.channel.js`）提供了两个与特有类型相关的静态方法，子类可以覆写。

### 2.1 getSupportedTypes()

声明该渠道支持的**通用消息类型**列表。

```javascript
// BaseChannel 默认实现（可继承）
static getSupportedTypes() {
  return ['text'];   // 所有渠道至少支持纯文本
}

// 子类覆写示例：同时支持 Markdown
static getSupportedTypes() {
  return ['text', 'markdown'];
}
```

**返回值含义**：

| 返回值 | 含义 |
|--------|------|
| `['text']` | 仅支持纯文本，收到 `markdown`/`html` 时需自行降级处理 |
| `['text', 'markdown']` | 支持 text 和 markdown，收到 `html` 需降级 |
| `['text', 'markdown', 'html']` | 三种全部支持 |

> 此方法的返回值用于前端展示该渠道支持哪些通用格式。不影响特有类型——特有类型走独立的 `getChannelSpecificTypes()` 注册。

### 2.2 getChannelSpecificTypes()

声明该渠道**特有的、超出通用类型之外的消息类型**。每个类型定义是一个结构化对象，包含字段 schema 和示例数据。

```javascript
// BaseChannel 默认实现（无特有类型）
static getChannelSpecificTypes() {
  return [];
}

// 子类覆写示例
static getChannelSpecificTypes() {
  return [
    {
      value: 'news',              // type 值（唯一键）
      label: '图文消息',          // 显示名称
      icon: '📰',                 // 可选图标 emoji
      description: '多条图文链接文章', // 功能描述
      fields: [...],             // extraData 字段定义（见 2.3 节）
      example: { ... }           // 完整调用示例
    },
    // ... 更多类型
  ];
}
```

**返回数组中每个元素的结构**：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `value` | `string` | 是 | 特有类型的标识符（对应 `extraData[namespace].channelType`），如 `'news'`、`'photo'` |
| `label` | `string` | 是 | 前端显示名称 |
| `icon` | `string` | 否 | 图标 emoji，前端 UI 使用 |
| `description` | `string` | 否 | 一句话描述该类型的用途 |
| `fields` | `Array<FieldDef>` | 是 | `extraData` 所需的字段定义（见下方 Schema） |
| `example` | `Object` | 否 | 完整的 `{ title, content, extraData }` 示例 |

### 2.3 类型定义 Schema

`fields` 数组中的每个元素描述 `extraData` 对象的一个字段：

```javascript
fields: [
  // 简单文本字段
  { name: 'title', label: '标题', type: 'text', required: true, maxLength: 128 },

  // 多行文本
  { name: 'description', label: '描述', type: 'textarea', required: false },

  // URL 类型
  { name: 'url', label: '跳转链接', type: 'url', required: false },

  // 下拉选择
  {
    name: 'card_type',
    label: '卡片样式',
    type: 'select',
    required: true,
    options: [
      { value: 'text_notice', label: '文本通知' },
      { value: 'news_notice', label: '图文通知' },
    ],
  },

  // 嵌套对象
  {
    name: 'main_title',
    label: '主标题',
    type: 'object',
    required: false,
    description: '{ title: "主标题内容" }',
  },

  // 数组（每项含多个子字段）
  {
    name: 'articles',
    label: '文章列表',
    type: 'array',
    required: true,
    itemFields: [
      { name: 'title', label: '标题', type: 'text', required: true },
      { name: 'url', label: '链接', type: 'url', required: false },
      { name: 'picurl', label: '封面图', type: 'url', required: false },
    ],
  },
]
```

**字段属性完整说明**：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 对应 `extraData` 对象的 key |
| `label` | `string` | 是 | 显示标签 |
| `type` | `string` | 是 | 字段类型：`text` / `textarea` / `url` / `number` / `select` / `object` / `array` / `json` |
| `required` | `boolean` | 否 | 是否必填，默认 `false` |
| `maxLength` | `number` | 否 | 最大长度限制 |
| `defaultValue` | `any` | 否 | 默认值 |
| `placeholder` | `string` | 否 | 占位提示文字 |
| `description` | `string` | 否 | 字段说明 |
| `options` | `Array<{value,label}>` | 否 | `select` 类型必须提供选项列表 |
| `itemFields` | `Array<FieldDef>` | 否 | `array` 类型必须提供子字段定义 |

---

## 3. 适配器改造步骤

以下是将一个**仅支持通用类型**的适配器升级为**同时支持特有类型**的标准流程。

### 3.1 改造 send() 方法

**改造前**（仅处理通用类型）：

```javascript
async send(message) {
  const { title, content, type = 'text' } = message;

  if (type === 'markdown') {
    // 处理 markdown...
  } else {
    // 处理 text/html...
  }
}
```

**改造后**（增加特有类型分支）：

```javascript
async send(message) {
  const { title, content, type = 'text', channelType, extraData } = message;

  // ★ 如果有 channelType（来自 extraData 命名空间），走特有类型处理
  if (channelType) {
    const myExtraData = extraData || null;  // extraData 已经是命名空间内的数据
    return await this.sendChannelSpecific(channelType, myExtraData);
  }

  // 以下保持原有的通用类型处理逻辑不变
  if (type === 'markdown') {
    // ...
  } else {
    // ...
  }
}
```

**关键要点**：
- 从 message 中解构出 `channelType`（由 push.service.js 从 `extraData[namespace].channelType` 提取）和 `extraData`（已经是命名空间内的数据）
- 判断条件：当存在 `channelType` 时进入特有分支
- `channelType` 仅表示**特有消息类型**，通用类型（text/markdown/html）由 `type` 字段控制，两者职责清晰分离
- 通用类型分支的逻辑**不做任何修改**，保证向后兼容

### 3.2 实现 sendChannelSpecific() 路由

这是一个统一的分发器方法，根据 `channelType` 将请求路由到对应的专属发送方法：

```javascript
/**
 * 处理渠道特有类型的消息
 * @param {string} type - 特有类型标识
 * @param {Object} extraData - 特有类型参数（已经是命名空间内的数据）
 */
async sendChannelSpecific(type, extraData) {
  switch (type) {
    case 'news':
      return await this.sendNews(extraData);
    case 'image':
      return await this.sendImage(extraData);
    case 'file':
      return await this.sendFile(extraData);
    case 'template_card':
      return await this.sendTemplateCard(extraData);
    default:
      throw new Error(`不支持的特有消息类型: ${type}`);
  }
}
```

**命名约定**：
- 方法名统一为 `send` + 首字母大写的类型名，如 `sendNews()`、`sendPhoto()`、`sendTemplateCard()`
- switch-case 的 value 与 `getChannelSpecificTypes()` 中的 `value` 一一对应
- default 分支必须抛出明确错误信息，方便排查

### 3.3 实现各类型的发送方法

每个特有类型对应一个独立的方法，从 `extraData` 中提取所需参数并构造目标平台的 API 请求体。

**基本模式**：

```javascript
/**
 * 发送图文消息
 * @param {Object} data - 来自 extraData 命名空间的参数对象
 */
async sendNews(data) {
  // 1. 参数校验（防御性编程）
  if (!data || !data.articles || !Array.isArray(data.articles)) {
    throw new Error('图文消息必须包含 articles 数组');
  }

  // 2. 构造目标平台所需的请求体
  const body = {
    msgtype: 'news',
    news: {
      articles: data.articles.map(article => ({
        title: article.title || '',
        description: article.description || '',
        url: article.url || '',
        picurl: article.picurl || '',
      })),
    },
  };

  // 3. 调用 API 发送
  logger.info(`发送图文消息: articles=${data.articles.length}`);
  const result = await this._sendBody(body);

  return { ...result, type: 'news' };   // 返回结果建议带上 type 标识
}
```

**常见变体模式**：

| 场景 | 模式 | 典型渠道 |
|------|------|---------|
| 直接传 JSON 到 API | 构造 body → POST | wecom news/text_card/template_card |
| 需要 Base64 上传再发 | base64 → upload → media_id → POST | wecomapp image/file |
| multipart 表单上传 | FormData → POST (multipart) | telegram photo/document |
| 需要签名/时间戳 | 构造 body → 加签 → POST | feishu post/image/share_chat |

> **注意**: 新架构下不再需要在 `getConfigFields()` 中添加 `defaultChannelSpecificType` 配置字段。所有类型选择都在调用时通过 `extraData[namespace].channelType` 指定。

---

## 4. 完整示例：为企业微信应用添加模板卡片

以下以 `wecomapp.channel.js`（企业微信应用）中的**模板卡片**类型为例，展示从零到有的完整实现过程。

### 4.1 需求分析

企业微信应用支持**模板卡片消息**（`msgtype: template_card`），这是一种高度可定制的富文本卡片，支持三种子样式：

| 子类型 | 适用场景 |
|--------|---------|
| `text_notice` | 文本通知公告（纯文字 + 按钮） |
| `news_notice` | 图文通知（带图片横幅 + 文字） |
| `button_interaction` | 按钮互动审批（多按钮 + 任务列表） |

### 4.2 在 getChannelSpecificTypes() 中注册

```javascript
static getChannelSpecificTypes() {
  return [
    // ... 其他类型省略 ...

    {
      value: 'template_card',
      label: '模板卡片',
      icon: '🃏',
      description: '交互式卡片消息，支持文本通知、图文通知和按钮互动三种样式',
      fields: [
        {
          name: 'card_type',
          label: '卡片类型',
          type: 'select',
          required: true,
          options: [
            { value: 'text_notice', label: '文本通知' },
            { value: 'news_notice', label: '图文通知' },
            { value: 'button_interaction', label: '按钮互动' },
          ],
        },
        { name: 'source', label: '来源信息', type: 'object', required: false,
          description: '{ desc_text: "来源描述" }' },
        { name: 'main_title', label: '主标题', type: 'object', required: false,
          description: '{ title: "主标题内容" }' },
        { name: 'sub_title_text', label: '副标题', type: 'text', required: false, maxLength: 256 },
        {
          name: 'horizontal_content_list',
          label: '横列内容列表',
          type: 'array',
          required: false,
          itemFields: [
            { name: 'keyname', label: '键名', type: 'text', required: true },
            { name: 'value', label: '值', type: 'text', required: true },
          ],
        },
        { name: 'card_action', label: '操作按钮', type: 'object', required: false,
          description: '{ url: "点击跳转URL", type: 1 }' },
      ],
      example: {
        title: '系统升级通知',
        content: '',
        extraData: {
          wecomapp: {                    // ★ 注意：example 也使用命名空间格式
            channelType: 'template_card', // ★ 类型在命名空间内
            card_type: 'text_notice',
            source: { desc_text: '来自魔法推送' },
            main_title: { title: '系统升级通知' },
            sub_title_text: '系统将于今晚22:00-23:00进行升级维护',
            horizontal_content_list: [
              { keyname: '时间', value: '2024-01-15 22:00-23:00' },
              { keyname: '影响范围', value: '所有用户' },
            ],
            card_action: { url: 'https://example.com/notice', type: 1 }
          }
        }
      }
    },
    // ... 其他类型省略 ...
  ];
}
```

### 4.3 在 sendChannelSpecific() 中添加路由

```javascript
async sendChannelSpecific(channelType, extraData) {
  switch (channelType) {
    case 'news':
      return await this.sendNews(extraData);
    case 'image':
      return await this.sendImage(extraData);
    case 'file':
      return await this.sendFile(extraData);
    case 'template_card':         // ★ 新增
      return await this.sendTemplateCard(extraData);
    case 'text_card':
      return await this.sendTextCard(extraData);
    default:
      throw new Error(`不支持的特有消息类型: ${channelType}`);
  }
}
```

### 4.4 实现 sendTemplateCard() 方法

```javascript
/**
 * 发送模板卡片消息
 * 支持三种卡片类型: text_notice(文本通知), news_notice(图文通知), button_interaction(按钮互动)
 * API 文档: https://developer.work.weixin.qq.com/document/path/90236
 */
async sendTemplateCard(data) {
  // 1. 参数校验
  if (!data || !data.card_type) {
    throw new Error('模板卡片必须指定 card_type');
  }

  const validTypes = ['text_notice', 'news_notice', 'button_interaction'];
  if (!validTypes.includes(data.card_type)) {
    throw new Error(
      `不支持的卡片类型: ${data.card_type}，支持的类型: ${validTypes.join(', ')}`
    );
  }

  // 2. 构造企业微信 API 请求体
  const body = {
    touser: this.touser,
    agentid: this.agentid,
    msgtype: 'template_card',
    template_card: {
      card_type: data.card_type,
      source: data.source || {},
      main_title: data.main_title || {},
      sub_title_text: data.sub_title_text || '',
      horizontal_content_list: data.horizontal_content_list || [],
      card_action: data.card_action || {},
      task_list: data.task_list || [],
      card_selection: data.card_selection || {},
    },
  };

  // 3. 日志 + 发送
  logger.info(`企业微信应用发送模板卡片: type=${data.card_type}`);
  const result = await this._sendBody(body);
  return { ...result, type: 'template_card' };
}
```

---

## 5. 已实现渠道速查表

以下是当前已完成特有类型实现的渠道及其支持的全部类型一览。

### 5.1 QQ 机器人 (`qqbot.channel.js`)

| 类型标识 (channelType) | 名称 | extraData 关键字段 | 说明 |
|---------|------|-------------------|------|
| `media` | 富媒体消息 | `file_type`, `url` 或 `file_data` | 图片/视频/语音/文件（需先上传） |

通用类型：`text` / `markdown` / `html`

### 5.2 企业微信群机器人 (`wecom.channel.js`)

| 类型标识 (channelType) | 名称 | extraData 关键字段 | 说明 |
|---------|------|-------------------|------|
| `news` | 图文消息 | `articles[{title,url,picurl}]` | 多条图文链接 |
| `image` | 图片 | `base64`, `md5` 或 `url` | Base64 编码或 URL 自动下载 |
| `file` | 文件 | `base64`, `md5`, `media_id` 或 `url` | 需上传获取 media_id |
| `voice` | 语音 | 同上 | AMR 格式 |
| `markdown_v2` | Markdown增强版 | `content` | 支持表格等丰富语法 |
| `template_card` | 模板卡片 | `card_type`, `source`, `main_title`, ... | 三种卡片样式 |

通用类型：`text` / `markdown` / `html`

### 5.3 企业微信应用 (`wecomapp.channel.js`)

| 类型标识 (channelType) | 名称 | extraData 关键字段 | 说明 |
|---------|------|-------------------|------|
| `news` | 图文消息 | `articles[{title,description,url,picurl}]` | 多条图文链接 |
| `text_card` | 文本卡片 | `title`, `description`, `url`, `btntxt` | 带跳转的卡片 |
| `template_card` | 模板卡片 | `card_type`, `source`, `main_title`, ... | 三种卡片样式 |
| `image` | 图片 | `media_id`, `base64`, `url`, `filename` | 需先上传获取 media_id |
| `file` | 文件 | 同上 | 同上 |
| `voice` | 语音 | 同上 | AMR 格式 |
| `video` | 视频 | 同上 | MP4 格式 |
| `mpnews` | mpnews 图文 | `articles[{title,content,...}]` | 富文本内容，封面图需上传 |
| `miniprogram_notice` | 小程序通知 | `appid`, `page`, `content_items`, ... | 小程序卡片 |

通用类型：`text` / `markdown` / `html`

> **与群机器人的区别**：企业微信应用的 image/file 需要先调用临时素材上传 API（`_uploadMedia()`）获取 `media_id` 再发送；群机器人可以直接将 base64 写入请求体。

### 5.4 飞书群机器人 (`feishu.channel.js`)

| 类型标识 (channelType) | 名称 | extraData 关键字段 | 说明 |
|---------|------|-------------------|------|
| `post` | 富文本 | `title`, `content[[{tag,text,...}]]` | 多段落/超链接/@人 |
| `interactive_card` | 交互卡片 | `card` (完整卡片 JSON) | 完整的飞书卡片对象 |
| `image` | 图片 | `image_key` 或 `base64` | 支持 image_key 或 base64 |
| `share_chat` | 群名片 | `share_chat_id` | 分享群聊名片 |

通用类型：`text` / `markdown` / `html`

> 飞书所有请求需要携带 `timestamp` + `sign` 签名。

### 5.5 Telegram Bot (`telegram.channel.js`)

| 类型标识 (channelType) | 名称 | extraData 关键字段 | 说明 |
|---------|------|-------------------|------|
| `photo` | 图片 | `url` 或 `base64`, `caption` | 支持 URL 或 multipart 上传 |
| `document` | 文件 | `url` 或 `base64`, `caption` | 同上 |
| `location` | 地理位置 | `latitude`, `longitude`, `title`, `address` | 发送地图位置 |

通用类型：`text` / `markdown` / `html`

> Telegram 的 photo/document 支持两种传入方式：直接传 URL（Telegram 服务器下载）或传 base64（multipart 表单上传）。

### 5.6 PushPlus (`pushplus.channel.js`)

PushPlus 的 `/send` 接口没有独立的消息类型，但提供一组可选参数用于精细化控制推送。这里使用**合成类型 `custom`**（自包含于 `extraData.pushplus` 命名空间）承载全部可选字段。

| 类型标识 (channelType) | 名称 | extraData 关键字段 | 说明 |
|---------|------|-------------------|------|
| `custom` | 完整参数推送 | `template`, `channel`, `option`, `callbackUrl`, `timestamp`, `pre`, `topic` | 暴露 PushPlus /send 的全部可选参数 |

通用类型：`text` / `markdown` / `html`

> 可选字段说明：
> - `template`：消息模板（html/txt/json/markdown/cloudMonitor/jenkins/route/pay），未指定时按通用 `type` 推导
> - `channel`：发送渠道（wechat/app/extension/webhook/clawbot/cp/mail/sms/voice）
> - `option`：渠道配置参数，object 自动 `JSON.stringify`，如 webhook 的 `{"url":"...","key":"..."}`
> - `callbackUrl`：异步回调地址；`timestamp`：毫秒时间戳（小于当前时间则不发送）；`pre`：会员预处理编码；`topic`：覆盖渠道配置群推
> - 命名空间内的 `title`/`content` 可覆盖顶层，实现该渠道独立内容

---

## 6. 测试与验证

### 6.1 通过 Debug 页面测试

项目内置了调试工具页面（`Debug.vue`），可以在其中直接填写 `extraData` JSON 进行测试：

1. 启动开发环境，打开前端页面
2. 进入「调试」页面
3. 选择目标渠道
4. 在 `extraData` 编辑框中使用**新格式**（包含渠道命名空间和 `channelType` 字段）
5. 点击发送

**extraData 新格式示例**：

```json
{
  "wecomapp": {
    "channelType": "template_card",
    "card_type": "text_notice",
    "source": { "desc_text": "来自魔法推送" },
    "main_title": { "title": "服务器告警" },
    "sub_title_text": "CPU 使用率超过 80%",
    "horizontal_content_list": [
      { "keyname": "主机", "value": "web-server-01" },
      { "keyname": "当前值", "value": "87%" }
    ]
  }
}
```

### 6.2 通过 API 测试

```bash
# 发送企业微信应用模板卡片
curl -X POST http://localhost:3000/api/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "title": "系统通知",
    "content": "",
    "extraData": {
      "wecomapp": {
        "channelType": "template_card",
        "card_type": "text_notice",
        "source": { "desc_text": "来自 MagicPush" },
        "main_title": { "title": "服务器告警" },
        "sub_title_text": "CPU 使用率超过 80%",
        "horizontal_content_list": [
          { "keyname": "主机", "value": "web-server-01" },
          { "keyname": "当前值", "value": "87%" }
        ],
        "card_action": { "url": "https://example.com/dashboard", "type": 1 }
      }
    }
  }'

# 发送 Telegram 图片
curl -X POST http://localhost:3000/api/push \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": <channel-id>,
    "title": "",
    "extraData": {
      "telegram": {
        "channelType": "photo",
        "url": "https://picsum.photos/800/600",
        "caption": "今日截图"
      }
    }
  }'

# 发送飞书富文本
curl -X POST http://localhost:3000/api/push \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": <channel-id>,
    "title": "",
    "extraData": {
      "feishu": {
        "channelType": "post",
        "title": "项目周报",
        "content": [[
          [{ "tag": "text", "text": "本周完成以下工作：" }],
          [{ "tag": "at", "user_id": "ou_xxxxx" }]
        ]]
      }
    }
  }'

# 发送 PushPlus（完整可选参数：markdown 模板 + webhook 渠道 + 回调）
curl -X POST http://localhost:3000/api/push \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": <channel-id>,
    "title": "服务器告警",
    "content": "磁盘使用率已达 98%",
    "type": "text",
    "extraData": {
      "pushplus": {
        "channelType": "custom",
        "template": "markdown",
        "channel": "webhook",
        "option": { "url": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" },
        "callbackUrl": "https://example.com/callback"
      }
    }
  }'

# 同时向多个渠道发送不同类型（多渠独立类型）
curl -X POST http://localhost:3000/api/push \
  -H "Content-Type: application/json" \
  -d '{
    "title": "重要通知",
    "content": "系统将于今晚维护",
    "extraData": {
      "qqbot": {
        "channelType": "media",
        "file_type": 1,
        "url": "https://example.com/notice-image.png"
      },
      "telegram": {
        "channelType": "photo",
        "url": "https://example.com/notice-photo.jpg",
        "caption": "维护通知"
      },
      "wecomapp": {
        "channelType": "template_card",
        "card_type": "text_notice",
        "main_title": { "title": "维护通知" }
      }
    }
  }'
```

### 6.3 单元测试建议

```javascript
// tests/channels/wecomapp-specific.test.js

describe('WecomappChannel 特有消息类型', () => {
  let channel;

  beforeEach(() => {
    channel = new WecomappChannel({
      corpid: 'test_corpid',
      corpsecret: 'test_secret',
      agentid: '1000001',
      touser: 'zhangsan',
    });
  });

  test('getChannelSpecificTypes 应返回多种类型', () => {
    const types = WecomappChannel.getChannelSpecificTypes();
    expect(types.length).toBeGreaterThan(0);
    expect(types.map(t => t.value)).toEqual(
      expect.arrayContaining(['news', 'template_card', 'image'])
    );
  });

  test('sendChannelSpecific 不支持的类型应报错', async () => {
    await expect(
      channel.sendChannelSpecific('nonexistent', {})
    ).rejects.toThrow('不支持的渠道特有类型: nonexistent');
  });

  test('sendTemplateCard 缺少 card_type 应报错', async () => {
    await expect(channel.sendTemplateCard({}))
      .rejects.toThrow('模板卡片必须指定 card_type');
  });
});
```

---

## 7. 常见问题

### Q: 是否所有渠道都需要实现特有类型？

不需要。特有类型是**可选增强功能**。对于只支持纯文本、且无原生扩展能力的渠道（如 Server酱），只需实现基础的 `send(message)` 即可，`getChannelSpecificTypes()` 返回空数组即可。

> 注意：PushPlus 虽无独立消息类型，但拥有丰富的 `/send` 可选参数，已通过合成类型 `custom`（命名空间 `pushplus`）支持，见 [5.6 节](#56-pushplus-pushpluschanneljs)。

### Q: extraData 和通用 type 字段会冲突吗？

不会。两者的职责清晰分离：
- `type`（text/markdown/html）仅控制**通用消息格式**的渲染方式
- `channelType`（由 `push.service.js` 从 `extraData[namespace].channelType` 提取）控制是否走**特有类型**分支
- `extraData[namespace]` 用于携带**特有消息类型**的结构化数据和类型标识

当 `extraData[namespace]` 中包含 `channelType` 字段时，系统会路由到对应的 `sendChannelSpecific()` 处理方法，与 `type` 字段互不干扰。

### Q: channelType 是从哪里来的？

**新架构（v2+）**：`channelType` 由**调用方在 `extraData` 的渠道命名空间内指定**，不再依赖渠道配置：

```javascript
// 调用方在 extraData 中指定类型
extraData: {
  wecomapp: {
    channelType: 'template_card',  // ★ 这里指定
    card_type: 'text_notice',
    // ...
  }
}
```

`push.service.js` 会自动从 `extraData[channel_type].channelType` 提取该值并注入到适配器调用中。

### Q: 旧版本的 defaultChannelSpecificType 配置还能用吗？

不能。旧版架构（通过渠道配置 `defaultChannelSpecificType` 设定默认类型）已被完全移除。如果需要使用特有消息类型，请改用在 `extraData` 命名空间内指定 `channelType` 的新方式。

迁移示例：

```javascript
// ❌ 旧方式（已废弃）
// 渠道配置: { defaultChannelSpecificType: 'template_card' }
// API 调用: { title: '', extraData: { card_type: 'text_notice', ... } }

// ✅ 新方式（推荐）
// 渠道配置: （无需配置特有类型相关字段）
// API 调用: { title: '', extraData: { wecomapp: { channelType: 'template_card', card_type: 'text_notice', ... } } }
```

### Q: extraData 的大小有限制吗？

没有硬性限制，但需要注意：
- 各平台 API 本身可能有请求体大小限制（如企业微信限制约 50KB）
- Base64 编码的图片/文件会使体积增大约 33%
- 建议 large file 使用 URL 引用而非内联 base64

### Q: 如何为一个已有渠道新增特有类型？

只需三步：

1. **在 `getChannelSpecificTypes()` 的返回数组中追加新的类型定义**
2. **在 `sendChannelSpecific()` 的 switch 中添加新 case**
3. **实现对应的 `sendXxx(data)` 方法**

无需修改基类、无需修改 push.service.js、无需修改数据库结构、**无需修改 getConfigFields()**。

### Q: 构造函数需要传 channelKey 吗？

**必须传递**。如果渠道支持特有类型，构造函数需要将 `channelKey` 传给基类：

```javascript
// 正确写法
constructor(config, channelId, channelKey) {
  super(config, channelKey);   // ★ 传入 channelKey
}

// 错误写法（会导致 extraData 命名空间隔离失效）
constructor(config, channelId) {
  super(config);               // ❌ 丢失了 channelKey
}
```

基类通过 `this.channelKey` 存储此值。但在新架构下，`push.service.js` 已经提前解析好命名空间数据，适配器的 `send()` 方法接收到的 `extraData` 已经是正确的命名空间数据，`this.channelKey` 主要用于日志和调试目的。

### Q: 同一个请求能否为不同渠道指定不同的特有类型？

**可以！这是新架构的核心优势之一**。由于类型和数据都自包含在每个渠道的命名空间内，同一个推送请求可以为不同渠道发送完全不同的消息类型：

```javascript
{
  title: '重要通知',
  extraData: {
    qqbot: { channelType: 'media', file_type: 1, url: '...' },         // QQ 发富媒体
    telegram: { channelType: 'photo', url: '...', caption: '...' },     // Telegram 发图片
    wecomapp: { channelType: 'template_card', card_type: 'text_notice', ... }  // 企业微信发卡片
  }
}
```

### Q: 前端如何获取特有类型定义供用户选择？

前端可通过以下 API 获取任意渠道的类型定义：

```bash
GET /api/channels/types
```

响应中每种渠道类型都会携带 `supported_types` 和 `channel_specific_types` 字段，前端据此动态渲染消息类型选择器和 extraData 表单。
