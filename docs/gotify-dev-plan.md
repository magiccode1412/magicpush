# Gotify 通知渠道 - 开发计划

> 状态：**待实现**
> 创建日期：2026-03-30

## 一、概述

[Gotify](https://gotify.net/) 是一个开源的自托管推送通知服务器，提供 REST API 和 Android 客户端。用户可以在自己的服务器上部署 Gotify，通过 API 推送消息，Android 客户端实时接收通知。

**核心特点**：
- 自托管，数据完全可控
- REST API 简洁（仅一个推送接口 `POST /message`）
- 支持 Markdown 消息格式
- 支持优先级（0-10），影响通知提醒方式
- Android 客户端支持推送通知
- 无第三方依赖，Docker 一键部署

## 二、Gotify API 信息

### 发送消息 API

```
POST {serverUrl}/message
Content-Type: application/json

三种鉴权方式（任选其一）：
  Header: X-Gotify-Key: {appToken}
  Header: Authorization: Bearer {appToken}
  Query:  ?token={appToken}
```

**请求体**：

```json
{
  "title": "消息标题",           // string, 可选
  "message": "消息内容",        // string, 必填，支持 Markdown（不含 HTML）
  "priority": 5,                // integer, 可选, 0-10, 默认为应用默认优先级
  "extras": {                   // object, 可选, 扩展数据
    "client::display": { "contentType": "text/markdown" }
  }
}
```

**响应体**：

```json
{
  "id": 25,
  "appid": 5,
  "message": "消息内容",
  "title": "消息标题",
  "priority": 5,
  "date": "2018-02-27T19:36:10.5045044+01:00",
  "extras": {}
}
```

### 优先级说明

| 优先级 | 效果 |
|--------|------|
| 0 | 静默通知（无声音、无振动） |
| 1-3 | 低优先级 |
| 4-7 | 正常优先级（默认） |
| 8-10 | 高优先级（持续提醒直到用户查看） |

### 用户配置流程

1. 自行部署 Gotify 服务端（Docker: `docker run -d -p 8080:80 gotify/server`）
2. 登录 WebUI，创建一个 Application
3. 获取该 Application 的 Token
4. Android 手机安装 Gotify 客户端，连接到自己的 Gotify 服务器
5. 使用服务端地址 + App Token 即可推送消息

## 三、实现方案

### 设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| 推送方式 | 直接调用 `POST /message` | Gotify 仅此一个推送接口 |
| 鉴权方式 | `X-Gotify-Key` Header | 简洁，与其他渠道风格一致 |
| 消息格式 | 优先 Markdown，降级纯文本 | Gotify 原生支持 Markdown 渲染 |
| 优先级 | 用户可配置，默认 5 | 不同消息可设置不同提醒级别 |
| SSL 验证 | 可选禁用 | 自部署环境可能使用自签名证书 |
| 无新增依赖 | 直接用 axios | 与现有架构一致 |

### 配置字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `serverUrl` | text | 是 | Gotify 服务端地址，如 `https://gotify.example.com` |
| `appToken` | password | 是 | Application Token，在 Gotify WebUI 创建应用后获取 |
| `priority` | number | 否 | 消息优先级 0-10，默认 5 |

### 消息类型处理

| 输入 type | Gotify 处理方式 |
|-----------|----------------|
| `text` | 直接作为 `message` 发送 |
| `markdown` | 直接发送，Gotify 原生渲染 Markdown |
| `html` | 剥离 HTML 标签转为纯文本后发送 |

## 四、涉及文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `server/src/services/channels/gotify.channel.js` | 渠道适配器（逻辑简单，无需单独 client 文件） |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `server/src/services/channels/index.js` | 注册 gotify 渠道（+2 行） |
| `server/src/middleware/validator.middleware.js` | 白名单添加 `gotify`（+1 处） |
| `web/src/views/channels/List.vue` | 添加颜色、图标、描述文本（+3 处） |

## 五、详细设计

### 渠道适配器 `gotify.channel.js`

```javascript
class GotifyChannel extends BaseChannel {
  constructor(config, channelId) {
    super(config);
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.appToken = config.appToken;
    this.priority = parseInt(config.priority) || 5;
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    let text = content;

    // HTML 转纯文本
    if (type === 'html') {
      text = this._stripHtml(text);
    }

    const body = {
      title: title || undefined,
      message: text,
      priority: this.priority,
    };

    // markdown 类型添加 extras 声明
    if (type === 'markdown') {
      body.extras = {
        'client::display': { 'contentType': 'text/markdown' },
      };
    }

    const response = await axios.post(
      `${this.serverUrl}/message`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Gotify-Key': this.appToken,
        },
        timeout: 15000,
      }
    );

    return response.data;
  }

  // validate, test, getName, getDescription, getConfigFields ...
}
```

### 前端 UI

| 属性 | 值 |
|------|-----|
| 渠道名称 | Gotify |
| 渠道描述 | 自托管推送通知服务 |
| 颜色 | `bg-indigo-500`（紫蓝色，Gotify 品牌色） |
| 图标 | `Bell`（铃铛，通知类图标） |

### getConfigFields()

```javascript
static getConfigFields() {
  return [
    {
      name: 'serverUrl',
      label: '服务器地址',
      type: 'text',
      required: true,
      placeholder: '如 https://gotify.example.com',
      description: 'Gotify 服务端地址',
    },
    {
      name: 'appToken',
      label: 'Application Token',
      type: 'password',
      required: true,
      placeholder: '在 Gotify WebUI 创建应用后获取',
      description: 'Gotify 应用的访问令牌',
    },
    {
      name: 'priority',
      label: '消息优先级',
      type: 'number',
      required: false,
      placeholder: '0-10，默认 5',
      description: '0=静默, 1-3=低, 4-7=正常, 8-10=高优先级持续提醒',
    },
  ];
}
```

## 六、实现复杂度评估

Gotify 是目前最简单的通知渠道之一：
- **仅 1 个 API 接口**（`POST /message`）
- **无 Token 刷新机制**（Token 是静态的，创建应用时生成）
- **无会话/频道概念**（不像 QQ Bot 需要创建会话）
- **无需单独 client 文件**（直接在 channel 中调用 axios）
- **预计代码量**：~120 行（含注释和辅助方法）

## 七、测试计划

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| 渠道注册 | `GET /api/channels/types` 包含 `gotify` | 列表中出现"Gotify" |
| 创建渠道 | 填写配置并保存 | 渠道创建成功 |
| 文本推送 | 推送纯文本消息 | Android 客户端收到通知 |
| Markdown 推送 | 推送 Markdown 消息 | Gotify WebUI 正确渲染 |
| 优先级 | 设置 priority=0 | 静默通知，无声音 |
| 优先级 | 设置 priority=10 | 持续提醒 |
| 测试按钮 | 点击测试 | 发送成功 |
| 无效地址 | 使用错误的服务器地址 | 返回明确错误 |
| 无效 Token | 使用错误的 Token | 返回 401 错误 |

## 八、参考资源

- Gotify 官网: https://gotify.net/
- Gotify API 文档: https://gotify.net/api-docs
- Gotify GitHub: https://github.com/gotify/server
- Gotify Android: https://github.com/gotify/android
- Docker 部署: `docker run -d -p 8080:80 gotify/server`
