# 新增通知渠道开发指南

本文档详细说明如何在项目中新增一个通知渠道（以 SMTP 邮件通知为例），涵盖后端适配器开发、渠道注册、以及相关的架构说明。

---

## 目录

- [1. 架构概览](#1-架构概览)
- [2. 开发前准备](#2-开发前准备)
- [3. 开发步骤](#3-开发步骤)
  - [3.1 创建渠道适配器](#31-创建渠道适配器)
  - [3.2 注册渠道](#32-注册渠道)
  - [3.3 安装依赖](#33-安装依赖)
- [4. 基类接口规范](#4-基类接口规范)
- [5. 配置字段类型说明](#5-配置字段类型说明)
- [6. 完整示例：SMTP 邮件渠道](#6-完整示例smtp-邮件渠道)
- [7. 测试验证](#7-测试验证)
- [8. 现有渠道参考](#8-现有渠道参考)
- [9. 常见问题](#9-常见问题)

---

## 1. 架构概览

项目采用**适配器模式（Adapter Pattern）**管理消息通知渠道。每个渠道是一个独立的适配器类，继承自 `BaseChannel` 基类，通过统一的注册机制被系统识别和使用。

```
server/src/services/channels/
├── base.channel.js          # 基类，定义统一接口
├── index.js                 # 渠道注册中心
├── wecom.channel.js         # 企业微信
├── telegram.channel.js      # Telegram
├── pushplus.channel.js      # PushPlus
├── wxpusher.channel.js      # WxPusher
├── feishu.channel.js        # 飞书
├── dingtalk.channel.js      # 钉钉
├── webhook.channel.js       # Webhook
├── wechat-official.channel.js # 微信公众号
└── serverchan.channel.js    # Server酱
```

### 数据流

```
用户触发通知
    ↓
NotificationService（通知服务）
    ↓
getChannelAdapter(type, config)  ← 根据 type 获取适配器
    ↓
adapter.send(message)            ← 统一调用 send 方法
    ↓
第三方 API / SMTP / Webhook      ← 适配器内部实现
```

### 核心设计特点

| 特点 | 说明 |
|------|------|
| **前端零改动** | 配置字段通过 `getConfigFields()` 声明，前端自动动态渲染表单 |
| **数据库零改动** | 渠道配置以 JSON 格式存储在 `channels` 表的 `config` 字段中 |
| **统一接口** | 所有渠道实现相同的 `send` / `validate` / `test` 方法 |
| **即插即用** | 只需创建文件并注册，无需修改其他模块 |

---

## 2. 开发前准备

### 2.1 了解涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/services/channels/<name>.channel.js` | **新建** | 渠道适配器实现 |
| `server/src/services/channels/index.js` | **修改** | 注册新渠道（添加 ~4 行代码） |
| `server/src/middleware/validator.middleware.js` | **修改** | 在 `createChannelValidation` 的 `isIn()` 白名单中添加渠道类型 |
| `server/package.json` | **修改** | 如需第三方依赖，添加到 dependencies |

### 2.2 不需要修改的文件

- **前端 Vue 组件**：配置表单通过 API 动态渲染，无需手动添加 UI
- **数据库模型/迁移**：`channels` 表结构通用，配置以 JSON 存储
- **路由/控制器**：渠道 CRUD 接口已通用化，无需新增接口

---

## 3. 开发步骤

### 3.1 创建渠道适配器

在 `server/src/services/channels/` 目录下新建 `<name>.channel.js` 文件。

**文件命名规范**：全小写，单词间用 `-` 分隔，如 `smtp.channel.js`、`bark.channel.js`。

**最小模板**：

```javascript
const BaseChannel = require('./base.channel');

class XxxChannel extends BaseChannel {
  constructor(config) {
    super(config);
    // 从 config 中提取所需配置项
  }

  /**
   * 发送消息（必须实现）
   */
  async send(message) {
    const { title, content, type = 'text' } = message;
    // 实现消息发送逻辑
    // 成功时返回: { success: true, messageId: 'xxx' }
    // 失败时抛出 Error
  }

  /**
   * 验证配置（必须实现）
   */
  validate(config) {
    // 返回 { valid: boolean, message: string }
    if (!config.xxx) {
      return { valid: false, message: 'xxx不能为空' };
    }
    return { valid: true, message: '' };
  }

  /**
   * 测试连接（必须实现）
   */
  async test() {
    try {
      await this.send({
        title: '测试消息',
        content: '这是一条来自魔法推送的测试消息',
        type: 'text',
      });
      return { success: true, message: '连接测试成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 渠道显示名称（必须实现）
   */
  static getName() {
    return '渠道名称';
  }

  /**
   * 渠道描述（可选，默认空字符串）
   */
  static getDescription() {
    return '渠道的简要描述';
  }

  /**
   * 配置字段定义（必须实现）
   * 前端会根据此定义自动渲染配置表单
   */
  static getConfigFields() {
    return [
      {
        name: 'token',
        label: 'Token',
        type: 'text',
        required: true,
        placeholder: '请输入Token',
        description: '从官方获取的Token',
      },
    ];
  }
}

module.exports = XxxChannel;
```

### 3.2 注册渠道

修改 `server/src/services/channels/index.js`，添加两处代码：

**1) 顶部添加 require 导入：**

```javascript
const XxxChannel = require('./xxx.channel');
```

**2) 在 `channelAdapters` 映射中注册：**

```javascript
const channelAdapters = {
  // ... 已有渠道 ...
  xxx: XxxChannel,  // 新增渠道
};
```

**3) 在 `module.exports` 中导出（可选，便于直接引用）：**

```javascript
module.exports = {
  // ... 已有导出 ...
  XxxChannel,
  // ... 其他导出 ...
};
```

> **注意**：`channelAdapters` 中的 **key**（如 `xxx`）是渠道类型标识符，会持久化到数据库，一旦定义后不可更改，否则已有渠道配置将无法匹配。

### 3.3 安装依赖

如果渠道需要第三方 npm 包，在 `server/` 目录下安装：

```bash
cd server
pnpm add <package-name>
```

---

## 4. 基类接口规范

`BaseChannel`（`base.channel.js`）定义了所有渠道适配器必须遵循的接口。

### 4.1 实例方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `constructor(config)` | `config: Object` | - | 接收渠道配置，调用 `super(config)` |
| `send(message)` | `message: { title, content, type }` | `Promise<Object>` | 发送消息，成功返回 `{ success: true, messageId }`，失败抛 `Error` |
| `validate(config)` | `config: Object` | `{ valid: boolean, message: string }` | 验证配置合法性 |
| `test()` | - | `Promise<{ success, message }>` | 发送测试消息，验证渠道连通性 |
| `createProxyAgent(proxyUrl)` | `proxyUrl: string` | `Agent \| null` | 基类提供，创建 HTTP/SOCKS 代理 Agent |

### 4.2 静态方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `static getName()` | `string` | 渠道显示名称（如 "企业微信"、"Telegram"） |
| `static getDescription()` | `string` | 渠道功能描述 |
| `static getConfigFields()` | `Array<ConfigField>` | 配置字段定义数组 |

### 4.3 message 对象结构

`send(message)` 接收的 message 参数：

```javascript
{
  title: '消息标题',       // 可能为空
  content: '消息正文',     // 消息内容
  type: 'text'            // 消息类型：'text' | 'markdown' | 'html'
}
```

### 4.4 代理支持

如果渠道需要访问境外 API（如 Telegram），可使用基类提供的 `createProxyAgent` 方法：

```javascript
async send(message) {
  const proxyAgent = this.createProxyAgent(this.config.proxyUrl);
  const axiosConfig = {};
  if (proxyAgent) {
    axiosConfig.httpsAgent = proxyAgent;
  }
  // 使用 axiosConfig 发送请求
}
```

支持的代理协议：`http://`、`https://`、`socks4://`、`socks5://`

---

## 5. 配置字段类型说明

`getConfigFields()` 返回的字段定义数组，前端会据此动态渲染配置表单。

### 5.1 字段属性

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 字段名，对应 config 对象的 key |
| `label` | `string` | 是 | 显示标签 |
| `type` | `string` | 是 | 字段类型（见下方类型列表） |
| `required` | `boolean` | 否 | 是否必填 |
| `placeholder` | `string` | 否 | 占位文本 |
| `description` | `string` | 否 | 字段说明文字 |
| `default` | `any` | 否 | 默认值 |
| `options` | `Array<{value, label}>` | 否 | 仅 `select` 类型需要 |

### 5.2 支持的字段类型

| type | 渲染为 | 适用场景 |
|------|--------|----------|
| `text` | 单行输入框 | Token、URL、用户名等 |
| `password` | 密码输入框 | 密码、密钥等敏感信息 |
| `number` | 数字输入框 | 端口号、超时时间等 |
| `select` | 下拉选择框 | 枚举选项（需配合 `options`） |
| `switch` | 开关 | 布尔值配置（如 SSL、启用/禁用） |
| `textarea` | 多行文本框 | 模板、长文本 |
| `json` | JSON 编辑器 | 复杂对象（如 Headers） |

### 5.3 示例：多种字段类型

```javascript
static getConfigFields() {
  return [
    {
      name: 'host',
      label: 'SMTP服务器',
      type: 'text',
      required: true,
      placeholder: 'smtp.qq.com',
      description: 'SMTP服务器地址',
    },
    {
      name: 'port',
      label: '端口',
      type: 'number',
      required: true,
      default: 465,
      description: 'SMTP服务端口',
    },
    {
      name: 'secure',
      label: '启用SSL',
      type: 'switch',
      required: false,
      default: true,
    },
    {
      name: 'authType',
      label: '认证方式',
      type: 'select',
      required: true,
      options: [
        { value: 'password', label: '密码认证' },
        { value: 'oauth', label: 'OAuth2' },
      ],
      default: 'password',
    },
    {
      name: 'password',
      label: '密码',
      type: 'password',
      required: true,
      placeholder: '请输入密码或授权码',
    },
  ];
}
```

---

## 6. 完整示例：SMTP 邮件渠道

以下是一个完整的 SMTP 邮件通知渠道实现。

### 6.1 安装依赖

```bash
cd server
pnpm add nodemailer
```

### 6.2 创建适配器文件

文件路径：`server/src/services/channels/smtp.channel.js`

```javascript
const nodemailer = require('nodemailer');
const BaseChannel = require('./base.channel');

/**
 * SMTP 邮件适配器
 * 通过 SMTP 协议发送邮件通知
 */
class SmtpChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.host = config.host;
    this.port = parseInt(config.port, 10) || 465;
    this.secure = config.secure !== false; // 默认启用
    this.user = config.user;
    this.pass = config.pass;
    this.from = config.from || config.user; // 默认与用户名相同
    this.to = config.to;
  }

  /**
   * 创建 SMTP 传输器
   */
  _createTransporter() {
    return nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: {
        user: this.user,
        pass: this.pass,
      },
    });
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    if (!this.to) {
      throw new Error('收件人地址不能为空');
    }

    const transporter = this._createTransporter();

    // 构建邮件内容
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: title || '通知',
    };

    // 根据 type 设置邮件正文格式
    if (type === 'html') {
      mailOptions.html = content;
    } else {
      mailOptions.text = content;
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  }

  validate(config) {
    if (!config.host || config.host.trim() === '') {
      return { valid: false, message: 'SMTP服务器地址不能为空' };
    }
    if (!config.port) {
      return { valid: false, message: '端口号不能为空' };
    }
    if (!config.user || config.user.trim() === '') {
      return { valid: false, message: '用户名不能为空' };
    }
    if (!config.pass || config.pass.trim() === '') {
      return { valid: false, message: '密码不能为空' };
    }
    if (!config.to || config.to.trim() === '') {
      return { valid: false, message: '收件人地址不能为空' };
    }

    // 验证端口范围
    const port = parseInt(config.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return { valid: false, message: '端口号无效，应为1-65535之间的数字' };
    }

    return { valid: true, message: '' };
  }

  async test() {
    try {
      await this.send({
        title: '测试消息',
        content: '这是一条来自魔法推送的测试消息',
        type: 'text',
      });
      return { success: true, message: '邮件发送测试成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'SMTP邮件';
  }

  static getDescription() {
    return '通过SMTP协议发送邮件通知，支持QQ邮箱、163邮箱、Gmail等';
  }

  static getConfigFields() {
    return [
      {
        name: 'host',
        label: 'SMTP服务器',
        type: 'text',
        required: true,
        placeholder: 'smtp.qq.com',
        description: 'SMTP服务器地址',
      },
      {
        name: 'port',
        label: '端口',
        type: 'number',
        required: true,
        placeholder: '465',
        description: 'SSL通常为465，TLS通常为587',
      },
      {
        name: 'secure',
        label: '启用SSL/TLS',
        type: 'switch',
        required: false,
        description: '端口465设为true，端口587设为false',
      },
      {
        name: 'user',
        label: '用户名',
        type: 'text',
        required: true,
        placeholder: 'your@email.com',
        description: '邮箱账号',
      },
      {
        name: 'pass',
        label: '密码/授权码',
        type: 'password',
        required: true,
        placeholder: '请输入密码或授权码',
        description: '邮箱密码或第三方授权码（QQ邮箱需使用授权码）',
      },
      {
        name: 'from',
        label: '发件人地址（可选）',
        type: 'text',
        required: false,
        placeholder: '默认与用户名相同',
        description: '发件人显示地址，留空则使用用户名',
      },
      {
        name: 'to',
        label: '收件人地址',
        type: 'text',
        required: true,
        placeholder: 'recipient@email.com',
        description: '收件人邮箱地址，多个用英文逗号分隔',
      },
    ];
  }
}

module.exports = SmtpChannel;
```

### 6.3 注册渠道

修改 `server/src/services/channels/index.js`：

```javascript
// 顶部添加导入
const SmtpChannel = require('./smtp.channel');

// channelAdapters 中添加映射
const channelAdapters = {
  // ... 已有渠道 ...
  smtp: SmtpChannel,
};

// module.exports 中添加导出
module.exports = {
  // ... 已有导出 ...
  SmtpChannel,
  // ...
};
```

### 6.4 常见邮箱 SMTP 配置

| 邮箱服务 | SMTP服务器 | 端口 | SSL | 说明 |
|----------|-----------|------|-----|------|
| QQ邮箱 | smtp.qq.com | 465 | true | 需使用授权码 |
| 163邮箱 | smtp.163.com | 465 | true | 需开启SMTP并使用授权码 |
| Gmail | smtp.gmail.com | 465 | true | 需使用应用专用密码 |
| Outlook | smtp.office365.com | 587 | false | 使用TLS |
| 阿里企业邮箱 | smtp.mxhichina.com | 465 | true | - |

---

## 7. 测试验证

### 7.1 服务端测试

1. 启动开发服务器
2. 通过 API 调用测试渠道：

```bash
# 获取渠道类型列表（确认新渠道已注册）
curl http://localhost:3000/api/channels/types

# 创建渠道配置
curl -X POST http://localhost:3000/api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "channel_type": "smtp",
    "name": "我的邮箱通知",
    "config": {
      "host": "smtp.qq.com",
      "port": 465,
      "secure": true,
      "user": "xxx@qq.com",
      "pass": "授权码",
      "to": "target@email.com"
    }
  }'

# 测试渠道连通性
curl -X POST http://localhost:3000/api/channels/<channel_id>/test \
  -H "Authorization: Bearer <token>"
```

### 7.2 前端验证

1. 打开前端页面
2. 进入「渠道管理」
3. 确认新渠道出现在可用渠道列表中
4. 确认配置表单根据 `getConfigFields()` 正确渲染
5. 填写配置并保存
6. 点击「测试」按钮验证连通性

### 7.3 测试检查清单

- [ ] 渠道名称和描述在前端正确显示
- [ ] 配置表单字段完整渲染（标签、占位符、说明文字）
- [ ] 必填字段验证生效（提交时空字段提示）
- [ ] 保存渠道配置成功
- [ ] 测试按钮发送测试消息成功
- [ ] 实际通知场景中消息正确送达
- [ ] 错误场景（如密码错误）有清晰的错误提示

---

## 8. 现有渠道参考

以下列表可帮助了解不同复杂度的渠道实现方式：

| 渠道 | 文件 | 特点 | 复杂度 |
|------|------|------|--------|
| PushPlus | `pushplus.channel.js` | 最简单的 HTTP POST 渠道 | ⭐ |
| Server酱 | `serverchan.channel.js` | URL-encoded POST + 可选参数 | ⭐ |
| 企业微信 | `wecom.channel.js` | Webhook + 签名 | ⭐⭐ |
| 飞书 | `feishu.channel.js` | Webhook + HMAC签名 + 卡片消息 | ⭐⭐ |
| Telegram | `telegram.channel.js` | 代理支持 + Markdown/HTML | ⭐⭐ |
| Webhook | `webhook.channel.js` | 模板变量 + JSON Body + 自定义Headers | ⭐⭐⭐ |

---

## 9. 常见问题

### Q: 添加新渠道后前端没有显示？

确认以下几点：
1. 文件是否放置在 `server/src/services/channels/` 目录下
2. `index.js` 中是否正确 import 并注册到 `channelAdapters`
3. 服务端是否已重启
4. `getConfigFields()` 返回的数组是否非空

### Q: 配置字段在前端显示不正确？

检查 `getConfigFields()` 中的字段定义：
- `name` 必须与 `send()` 方法中使用的 `config.xxx` 一致
- `type` 必须是支持的类型（text/password/number/select/switch/textarea/json）
- `select` 类型必须提供 `options` 数组

### Q: 如何支持多个收件人？

在配置字段中用一个字段，值用逗号分隔，然后在 `send()` 中 `split(',')` 处理。参考 SMTP 示例中的 `to` 字段。

### Q: 渠道适配器中如何使用代理？

使用基类提供的 `this.createProxyAgent(proxyUrl)` 方法。参考 `telegram.channel.js` 中的实现。在配置字段中添加一个代理地址字段即可。

### Q: 如何处理消息类型转换？

`send(message)` 的 `message.type` 可能是 `text`、`markdown`、`html`。根据目标渠道的能力进行转换：
- 支持 Markdown 的渠道直接透传
- 只支持纯文本的渠道剥离格式标记
- 支持 HTML 的渠道可以将 Markdown 转换为 HTML 后发送
