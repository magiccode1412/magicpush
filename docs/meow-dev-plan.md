# Meow 通知渠道 - 开发计划

> 状态：**已实现**
> 创建日期：2026-03-30

## 一、概述

[Meow](https://www.chuckfang.com/MeoW/) 是一款专为鸿蒙系统开发的推送通知应用。通过 REST API 推送消息到用户的鸿蒙设备，支持纯文本和 HTML 两种消息格式。

**核心特点**：
- 专为鸿蒙系统设计
- API 极简，仅需用户昵称即可推送，无需 Token
- 支持 GET/POST 请求方式
- 支持纯文本和 HTML 消息渲染
- HTML 消息可自定义显示高度

## 二、Meow API 信息

### 接口地址

```
https://api.chuckfang.com/
http://api.chuckfang.com/
```

### 发送消息 API

```
POST /{nickname} 或 POST /{nickname}/{title}
Content-Type: application/json

无需鉴权，通过路径参数中的用户昵称标识推送目标
```

**请求体**：

```json
{
  "title": "消息标题",           // string, 可选（也可放在路径中）
  "msg": "消息内容"             // string, 必填
}
```

**查询参数**：

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| `msgType` | string | 否 | 消息显示类型：`text`（默认，纯文本）或 `html`（渲染 HTML） |
| `htmlHeight` | number | 否 | 仅 `msgType=html` 时生效，HTML 显示高度（像素），默认 200 |
| `url` | string | 否 | 点击通知后的跳转链接（需 URL 编码） |

**响应体**：

```json
{
  "status": 200,
  "message": "推送成功"
}
```

**状态码说明**：

| 状态码 | 含义 |
|--------|------|
| 200 | 操作成功 |
| 400 | 参数错误 |
| 500 | 服务器错误 |

### GET 请求方式（备选）

```
GET /{nickname}/{title}/{msg}?url={url}&msgType={msgType}&htmlHeight={htmlHeight}
```

> 当前实现使用 POST JSON 方式。

### 用户配置流程

1. 在鸿蒙设备上安装 Meow App
2. 在 App 中设置一个用户昵称
3. 将昵称填入 MagicPush 渠道配置
4. 即可接收推送通知

## 三、实现方案

### 设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| 请求方式 | POST JSON | 比 GET 更规范，消息体不受 URL 长度限制 |
| 消息格式 | 默认纯文本，可选 HTML | Meow 不支持 Markdown，Markdown 需转为纯文本 |
| 鉴权方式 | 无（通过昵称标识） | Meow API 本身无 Token 机制 |
| HTML 高度 | 固定 400px | 适合大多数推送内容展示 |
| 昵称编码 | `encodeURIComponent` | 防止特殊字符导致 URL 异常 |
| 无新增依赖 | 直接用 axios | 与现有架构一致 |

### 配置字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nickname` | text | 是 | Meow App 中设置的用户昵称（不允许包含斜杠） |
| `msgType` | select | 否 | 消息类型：`text`（纯文本，默认）或 `html`（渲染 HTML） |

### 消息类型处理

| 输入 type | Meow 处理方式 |
|-----------|--------------|
| `text` | 直接作为 `msg` 发送 |
| `markdown` | 剥离 Markdown 语法转为纯文本后发送 |
| `html` | 直接作为 HTML 发送（需配置 `msgType=html`） |

> 注意：如果用户配置了 `msgType=html`，即使输入是 `text` 类型，也会以 HTML 格式发送（由 `send()` 中的逻辑决定）。

## 四、涉及文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `server/src/services/channels/meow.channel.js` | 渠道适配器（逻辑简单，无需单独 client 文件） |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `server/src/services/channels/index.js` | 注册 meow 渠道（import + 映射 + 导出，+3 行） |
| `server/src/middleware/validator.middleware.js` | 白名单添加 `meow`（+1 处） |
| `web/src/views/channels/List.vue` | 添加颜色、图标（Cat）、import、描述文本（+4 处） |
| `web/src/views/Login.vue` | 页脚渠道列表添加 Meow（+1 处） |
| `web/src/views/About.vue` | 图标列表添加 Meow、功能描述更新、import（+3 处） |

## 五、详细设计

### 渠道适配器 `meow.channel.js`

```javascript
class MeowChannel extends BaseChannel {
  constructor(config, channelId) {
    super(config);
    this.nickname = config.nickname;
    this.msgType = config.msgType || 'text';
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    let msg = content;

    // HTML 类型或用户配置了 html 模式时，使用 html 渲染
    if (type === 'html' || this.msgType === 'html') {
      this.msgType = 'html';
    } else if (type === 'markdown') {
      // Markdown 转纯文本（Meow 不支持 Markdown）
      msg = this._markdownToText(msg);
    }

    const params = {};
    if (this.msgType === 'html') {
      params.msgType = 'html';
      params.htmlHeight = 400;
    }

    const body = { title: title || undefined, msg };

    const response = await axios.post(
      `https://api.chuckfang.com/${encodeURIComponent(this.nickname)}`,
      body,
      { params, headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    return response.data;
  }
}
```

### 前端 UI

| 属性 | 值 |
|------|-----|
| 渠道名称 | Meow |
| 渠道描述 | 鸿蒙系统推送通知应用 |
| 颜色 | `bg-orange-600`（橙色，猫主题配色） |
| 图标 | `Cat`（猫，契合 Meow 名称） |

### getConfigFields()

```javascript
static getConfigFields() {
  return [
    {
      name: 'nickname',
      label: '用户昵称',
      type: 'text',
      required: true,
      placeholder: '在 Meow App 中设置的昵称',
      description: '用于标识推送目标的用户昵称',
    },
    {
      name: 'msgType',
      label: '消息类型',
      type: 'select',
      required: false,
      defaultValue: 'text',
      options: [
        { label: '纯文本', value: 'text' },
        { label: 'HTML', value: 'html' },
      ],
      description: 'text=纯文本显示，html=在App中渲染HTML格式',
    },
  ];
}
```

## 六、实现复杂度评估

Meow 是最轻量的通知渠道：
- **仅 1 个 API 接口**（`POST /{nickname}`）
- **无鉴权机制**（通过昵称标识用户，安全性依赖昵称私密性）
- **无 Token 刷新**、**无会话概念**
- **仅支持纯文本和 HTML**（不支持 Markdown）
- **无需单独 client 文件**
- **代码量**：~136 行（含注释和辅助方法）

## 七、测试计划

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| 渠道注册 | `GET /api/channels/types` 包含 `meow` | 列表中出现"Meow" |
| 创建渠道 | 填写昵称并保存 | 渠道创建成功 |
| 文本推送 | 推送纯文本消息 | 鸿蒙设备收到通知 |
| HTML 推送 | 配置 msgType=html，推送 HTML 消息 | App 正确渲染 HTML |
| Markdown 推送 | 推送 Markdown 消息 | 转为纯文本显示 |
| 测试按钮 | 点击测试 | 发送成功 |
| 无效昵称 | 使用不存在的昵称 | 返回错误 |
| 昵称含斜杠 | 昵称中包含 `/` | 前端验证拦截 |

## 八、参考资源

- Meow 官网: https://www.chuckfang.com/MeoW/
- Meow API 文档: https://www.chuckfang.com/MeoW/api_doc.html
- API 端点: https://api.chuckfang.com/
