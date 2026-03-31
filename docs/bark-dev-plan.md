# Bark 通知渠道 - 开发计划

> 状态：**待实现**
> 创建日期：2026-03-31

## 一、概述

[Bark](https://github.com/Finb/Bark) 是一款 iOS 推送通知应用，免费、简单、安全，基于 APNs 实现推送，不消耗设备电量。Bark 支持自部署服务端，用户也可以使用官方公共服务 `https://api.day.app`。

**核心特点**：
- iOS 原生推送，基于 APNs，低功耗
- 支持通知分组、自定义图标、铃声、时效性通知、临界警报等
- 支持自部署服务端（Docker 一键部署）
- 支持加密推送（端到端加密）
- REST API 简洁（核心仅一个推送接口 `POST /push`）
- 无需复杂鉴权，通过 device_key 标识设备
- 开源免费（MIT License），GitHub 7.8k+ Stars

## 二、Bark API 信息

### 发送消息 API（V2）

```
POST {serverUrl}/push
Content-Type: application/json; charset=utf-8

无独立鉴权 Header，通过 body 中的 device_key 标识目标设备
```

**请求体**：

```json
{
  "device_key": "设备唯一标识",      // string, 必填
  "title": "消息标题",               // string, 可选，字号比 body 大
  "body": "消息内容",                // string, 必填（但服务端有兜底处理）
  "subtitle": "消息副标题",           // string, 可选
  "sound": "alarm",                  // string, 可选, 铃声名称（见 Sounds 列表）
  "icon": "https://example.com/icon",// string, 可选, 通知图标 URL（iOS 15+）
  "group": "groupName",              // string, 可选, 通知分组名
  "url": "https://example.com",      // string, 可选, 点击通知跳转 URL
  "level": "active",                 // string, 可选, 通知级别
  "badge": 1,                        // integer, 可选, App 图标角标数
  "call": "1",                       // string, 可选, 设为 "1" 时铃声持续播放 30 秒
  "autoCopy": "1",                   // string, 可选, 设为 "1" 时自动复制内容
  "copy": "要复制的文本",             // string, 可选, 指定复制内容
  "isArchive": "1",                  // string, 可选, 设为 "1" 时归档
  "action": "none",                  // string, 可选, 设为 "none" 点击通知不做任何操作
  "volume": "0.5",                   // string, 可选, 临界警报音量
  "ciphertext": "加密密文"           // string, 可选, 加密推送密文
}
```

**响应体（成功）**：

```json
{
  "code": 200,
  "message": "success",
  "timestamp": 1712345678
}
```

**响应体（失败）**：

```json
{
  "code": 400,
  "message": "device key is empty",
  "timestamp": 1712345678
}
```

### 通知级别说明

| level 值 | 效果 |
|-----------|------|
| `active` | 默认值，系统立即点亮屏幕显示通知 |
| `timeSensitive` | 时效性通知，可在专注模式下显示 |
| `passive` | 静默添加到通知列表，不点亮屏幕 |
| `critical` | 临界警报，忽略静音和勿扰模式，始终播放声音并显示（需 iOS 特殊权限） |

### V1 兼容 API（GET 请求）

Bark 同时支持简洁的 GET 请求格式：

```
GET {serverUrl}/{deviceKey}/{title}/{body
GET {serverUrl}/{deviceKey}/{title}/{subtitle}/{body
```

也支持通过 Query 参数传递扩展字段：
```
GET {serverUrl}/{deviceKey}/{body}?sound=alarm&group=test&icon=https://example.com/icon
```

### 用户配置流程

1. App Store 安装 Bark iOS 客户端
2. 打开 App，自动生成设备唯一 Key 和推送 URL
3. 复制推送 URL（如 `https://api.day.app/yourkey`），请求该 URL 即可推送
4. 如需自部署：`docker run -dt --name bark -p 8080:8080 -v ./bark-data:/data finab/bark-server`
5. 自部署后，在 Bark App 中切换服务器地址为自建地址，获取新的 device_key

## 三、实现方案

### 设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| API 版本 | 使用 V2（`POST /push`） | REST 标准，JSON 格式，更规范 |
| 推送方式 | 直接调用 `POST /push` | Bark 核心仅此一个推送接口 |
| 鉴权方式 | device_key 放在 body 中 | Bark 设计如此，key 即是设备标识 |
| 消息格式 | 直接使用 body 字段 | Bark 通知不支持 Markdown 渲染，body 为纯文本 |
| HTML 处理 | 剥离 HTML 标签转为纯文本 | Bark 仅展示纯文本通知 |
| 优先级 | 映射为 level 参数 | `critical` 对应高优先级，`passive` 对应低优先级 |
| SSL 验证 | 可选禁用 | 自部署环境可能使用自签名证书 |
| 无新增依赖 | 直接用 axios | 与现有架构一致 |

### 配置字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `serverUrl` | text | 是 | Bark 服务端地址，如 `https://api.day.app`（官方）或自建地址 |
| `deviceKey` | text | 是 | 设备唯一标识，打开 Bark App 自动生成 |
| `group` | text | 否 | 通知分组名，留空则不分组 |
| `sound` | text | 否 | 推送铃声名称，留空使用默认铃声 |
| `level` | select | 否 | 通知级别：`active`（默认）/ `timeSensitive` / `passive` / `critical` |
| `icon` | text | 否 | 通知图标 URL（iOS 15+） |

### 消息类型处理

| 输入 type | Bark 处理方式 |
|-----------|---------------|
| `text` | 直接作为 `body` 发送 |
| `markdown` | 剥离 Markdown 语法转为纯文本后作为 `body` 发送 |
| `html` | 剥离 HTML 标签转为纯文本后作为 `body` 发送 |

## 四、涉及文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `server/src/services/channels/bark.channel.js` | 渠道适配器（逻辑简单，无需单独 client 文件） |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `server/src/services/channels/index.js` | 注册 bark 渠道（import +2 行，map +1 行，exports +1 行） |
| `server/src/middleware/validator.middleware.js` | 白名单添加 `bark`（+1 处） |
| `web/src/views/channels/List.vue` | 添加颜色、图标、描述文本（+3 处） |

## 五、详细设计

### 渠道适配器 `bark.channel.js`

```javascript
class BarkChannel extends BaseChannel {
  constructor(config, channelId) {
    super(config);
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.deviceKey = config.deviceKey;
    this.group = config.group || '';
    this.sound = config.sound || '';
    this.level = config.level || 'active';
    this.icon = config.icon || '';
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    let body = content;

    // Markdown 转纯文本
    if (type === 'markdown') {
      body = this._stripMarkdown(body);
    }

    // HTML 转纯文本
    if (type === 'html') {
      body = this._stripHtml(body);
    }

    const payload = {
      device_key: this.deviceKey,
      title: title || undefined,
      body: body,
      level: this.level,
    };

    // 可选参数
    if (this.group) payload.group = this.group;
    if (this.sound) payload.sound = this.sound;
    if (this.icon) payload.icon = this.icon;

    const response = await axios.post(
      `${this.serverUrl}/push`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        timeout: 15000,
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || '推送失败');
    }

    return response.data;
  }

  // validate, test, getName, getDescription, getConfigFields ...
}
```

### 前端 UI

| 属性 | 值 |
|------|-----|
| 渠道名称 | Bark |
| 渠道描述 | iOS 自定义推送通知 |
| 颜色 | `bg-orange-500`（橙色，Bark 品牌色——树皮棕色系） |
| 图标 | `BellRing`（铃铛响铃，推送通知类图标） |

### getConfigFields()

```javascript
static getConfigFields() {
  return [
    {
      name: 'serverUrl',
      label: '服务器地址',
      type: 'text',
      required: true,
      placeholder: '如 https://api.day.app',
      description: 'Bark 服务端地址，官方为 https://api.day.app，也可自建',
    },
    {
      name: 'deviceKey',
      label: 'Device Key',
      type: 'text',
      required: true,
      placeholder: '打开 Bark App 自动生成',
      description: '设备唯一标识，在 Bark App 首页可复制',
    },
    {
      name: 'group',
      label: '通知分组',
      type: 'text',
      required: false,
      placeholder: '留空则不分组',
      description: '指定推送消息的分组名',
    },
    {
      name: 'sound',
      label: '推送铃声',
      type: 'text',
      required: false,
      placeholder: '如 alarm, minuet, 留空使用默认',
      description: '铃声名称，支持 Bark 内置铃声及自定义铃声',
    },
    {
      name: 'level',
      label: '通知级别',
      type: 'select',
      required: false,
      options: [
        { label: '默认（active）', value: 'active' },
        { label: '时效性通知', value: 'timeSensitive' },
        { label: '静默通知', value: 'passive' },
        { label: '临界警报', value: 'critical' },
      ],
      description: 'active=默认, timeSensitive=专注模式可显示, passive=静默, critical=忽略勿扰模式',
    },
    {
      name: 'icon',
      label: '通知图标',
      type: 'text',
      required: false,
      placeholder: '如 https://example.com/icon.png',
      description: '自定义通知图标 URL（仅 iOS 15+ 支持）',
    },
  ];
}
```

## 六、实现复杂度评估

Bark 与 Gotify 类似，都是非常简单的通知渠道：
- **仅 1 个 API 接口**（`POST /push`）
- **无 Token 刷新机制**（device_key 是静态的）
- **无会话/频道概念**
- **无需单独 client 文件**（直接在 channel 中调用 axios）
- **无鉴权 Header**（device_key 在 body 中传递，更简单）
- **可选配置项较多**（sound、group、icon、level 等，但都是简单的字段传递）
- **预计代码量**：~150 行（含注释和辅助方法）

## 七、测试计划

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| 渠道注册 | `GET /api/channels/types` 包含 `bark` | 列表中出现"Bark" |
| 创建渠道 | 填写 serverUrl 和 deviceKey 并保存 | 渠道创建成功 |
| 纯文本推送 | 推送纯文本消息 | iPhone 收到通知 |
| HTML 推送 | 推送 HTML 格式消息 | 通知内容为剥离标签后的纯文本 |
| Markdown 推送 | 推送 Markdown 格式消息 | 通知内容为剥离语法后的纯文本 |
| 通知分组 | 设置 group 参数 | 通知按分组归类显示 |
| 通知级别 | 设置 level=passive | 静默通知，不点亮屏幕 |
| 通知级别 | 设置 level=critical | 临界警报（需设备授权） |
| 测试按钮 | 点击测试 | 发送成功 |
| 官方服务 | 使用 `https://api.day.app` | 推送成功 |
| 自建服务 | 使用自部署 Bark 服务端 | 推送成功 |
| 无效 Key | 使用错误的 device_key | 返回 400 错误 |
| 无效地址 | 使用错误的服务器地址 | 返回连接错误 |

## 八、参考资源

- Bark 官网: https://bark.day.app/
- Bark API V2 文档: https://github.com/Finb/bark-server/blob/master/docs/API_V2.md
- Bark iOS 客户端 GitHub: https://github.com/Finb/Bark
- Bark 服务端 GitHub: https://github.com/Finb/bark-server
- Bark 铃声列表: https://github.com/Finb/Bark/tree/master/Sounds
- Docker 部署: `docker run -dt --name bark -p 8080:8080 -v ./bark-data:/data finab/bark-server`
- 官方公共服务器: `https://api.day.app`
