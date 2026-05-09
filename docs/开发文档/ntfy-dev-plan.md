# ntfy 通知渠道 - 开发计划

> 状态：**待实现**
> 创建日期：2026-05-06

## 一、概述

[ntfy](https://ntfy.sh/) 是一个轻量级的开源推送通知服务，允许你通过简单的 HTTP POST/PUT 请求将消息推送到手机或桌面端。它以 **Topic（主题）** 为核心概念——只需向一个 Topic URL 发送消息，所有订阅了该 Topic 的设备就能收到推送。

**核心特点**：
- **极简 API**：一个 POST/PUT 请求即可发送，无需注册账号（公开模式）
- **Topic 即密码**：Topic 名称本身作为访问凭证，选择不易猜测的名称即可保证安全
- **原生支持 Markdown**：服务端渲染，支持粗体、链接、代码块等
- **优先级系统**：5 个级别（1-5），控制振动和声音行为
- **丰富的附加功能**：
  - **Tags（标签）**：支持 Emoji 标签和自定义标签，用于分类和视觉标识
  - **Action Buttons（操作按钮）**：支持打开网址 / 发送 HTTP 请求 / 复制到剪贴板 / Android 广播
  - **Click Action（点击跳转）**：通知点击时打开指定 URL
  - **Attachments（附件）**：支持本地文件上传或外部 URL 附件
  - **Scheduled Delivery（定时投递）**：延迟发送消息（10秒 ~ 3天）
  - **Message Templating（消息模板）**：内置 GitHub/Grafana/Alertmanager 模板 + Go 模板语言
  - **E-mail 转发**：同时将消息转发到邮箱
- **多客户端支持**：Android（Google Play/F-Droid）、iOS、Web App、桌面端 CLI
- **公共云服务**：官方提供 `https://ntfy.sh` 免费使用（有频率限制）
- **自托管友好**：单二进制文件部署，Docker 一行命令启动
- **无第三方依赖**：纯 Go 编写

## 二、ntfy API 信息

### 2.1 发送消息 API

```
POST {serverUrl}/{topic}
PUT {serverUrl}/{topic}
Content-Type: text/plain （或 text/markdown）

三种鉴权方式（任选其一，也可完全匿名）：
  Header: Authorization: Bearer {accessToken}
  Query:  ?auth={accessToken}   （仅用于 GET 请求）
  匿名：不传鉴权信息           （取决于服务器配置是否允许）
```

**请求体（Body）**: 直接放消息内容（纯文本字符串），**不是 JSON**

**关键 HTTP Headers**:

| Header | 别名 | 类型 | 必填 | 说明 |
|--------|------|------|------|------|
| `X-Title` | Title, ti, t | string | 否 | 消息标题（默认显示 Topic URL） |
| `X-Priority` | Priority, prio, p | int/string | 否 | 优先级 1-5 或 min/low/default/high/max |
| `X-Tags` | Tags, tag, ta | string | 否 | 标签，逗号分隔（如 `warning,skull,backup-host`） |
| `X-Markdown` | Markdown, md | bool | 否 | 设为 `yes`/`true` 启用 Markdown 渲染 |
| `X-Click` | Click | URL | 否 | 点击通知后打开的 URL |
| `X-Icon` | Icon | URL | 否 | 通知图标 URL（JPEG/PNG） |
| `X-Attach` | Attach, a | URL | 否 | 外部附件 URL |
| `X-Filename` | Filename, File, f | string | 否 | 附件文件名 |
| `X-Actions` | Actions, Action | string/JSON | 否 | 操作按钮定义（分号分隔多个动作） |
| `X-Email` | Email, E-mail, Mail, e | email/bool | 否 | 转发到邮箱地址 |
| `X-Delay` | Delay, At, X-At, At, X-In, In | time | 否 | 定时投递（Unix 时间戳 / 自然语言 / 时长） |
| `Authorization` | — | string | 条件必填 | Bearer Token 认证 |

### 2.2 优先级说明

|| 优先级 | ID | 效果 |
|---|--------|-----|------|
| 最小 | 1 | min | 无振动无声音，归入"其他通知"折叠区 |
| 低 | 2 | low | 无振动无声音，下拉通知栏可见 |
| 默认 | 3 | default | 短默认振动+声音（**默认值**） |
| 高 | 4 | high | 长振动+声音+弹窗提醒 |
| 最大/紧急 | 5 | max/urgent | 长振动持续+大声+全屏弹窗 |

### 2.3 消息类型处理

ntfy 的消息格式由 Content-Type 或 Header 决定：

| 输入 type | 处理方式 |
|-----------|----------|
| `text` | Body 作为纯文本直接发送，Content-Type = `text/plain` |
| `markdown` | Body 作为 Markdown 发送，设置 `Markdown: yes` Header，Content-Type = `text/plain` |
| `html` | 剥离 HTML 标签转为纯文本后发送 |

### 2.4 响应体示例

```json
{
  "id": "925",
  "time": "2026-05-06T12:00:00.123456+08:00",
  "event": "message",
  "topic": "mytopic",
  "message": "消息内容",
  "title": "消息标题",
  "priority": 3,
  "tags": ["warning"],
  "click": "https://example.com",
  "icon": "",
  "attachments": null,
  "actions": []
}
```

## 三、用户配置流程

### 方式一：使用公共云 ntfy.sh（推荐入门）

1. 在手机上安装 [ntfy 客户端](https://ntfy.sh/docs/subscribe/phone/)
2. 打开 app，订阅一个 Topic（输入 Topic 名称，如 `mysecretalerts_abc123`）
   - Topic 名称即"密码"，选一个别人猜不到的名字
3. 使用服务端地址 `https://ntfy.sh` + Topic 名称即可推送消息

### 方式二：自托管

1. Docker 一键部署：`docker run -p 8080:80 binwiederhier/ntfy`
2. （可选）配置访问控制（用户名/密码 或 Access Token）
3. 手机客户端连接到自托管的 ntfy 服务地址
4. 订阅 Topic 后即可接收推送

## 四、实现方案

### 设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| **推送方式** | HTTP POST 到 `/{topic}` | ntfy 最标准的使用方式，所有元数据通过 Header 传递 |
| **鉴权方式** | `Authorization: Bearer {token}` Header | 与项目现有 JWT 风格一致；Token 为可选字段（公共 Topic 可为空） |
| **消息格式** | 根据 input type 自动切换 | text→纯文本, markdown→加 Markdown Header, html→剥离标签 |
| **优先级** | 用户可配置，默认 3（default） | 不同场景不同级别 |
| **点击跳转** | 利用 MagicPush 已有的 `url` 字段映射到 `Click` Header | 复用现有消息结构 |
| **SSL 验证** | 可选禁用 | 自部署环境可能使用自签名证书 |
| **无新增依赖** | 直接用 axios | 与现有架构一致 |

### 配置字段设计

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `serverUrl` | text | 是 | ntfy 服务端地址，如 `https://ntfy.sh`（公共云）或 `https://ntfy.example.com`（自托管） |
| `topic` | text | 是 | Topic 名称（相当于频道名/密码），如 `myapp_alerts`。**建议使用复杂名称防止被他人猜到** |
| `accessToken` | password | 否 | Access Token（自托管且开启认证时需要；ntfy.sh 公共云不需要） |
| `priority` | select | 否 | 消息优先级，默认 `3`（default）。选项：min(1)/low(2)/default(3)/high(4)/max(5) |

### 为什么 Topic 作为必填配置而不是自动生成？

ntfy 的 Topic 是用户语义化的命名空间：
- 用户可能希望按用途划分 Topic：`server_backup`、`ci_cd_alerts`、`home_automation`
- 用户可能已经在手机上订阅了某个特定 Topic
- Topic 名称是用户主动选择的安全边界

## 五、涉及文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `server/src/services/channels/ntfy.channel.js` | 渠道适配器（逻辑简单，~150 行含注释） |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `server/src/services/channels/index.js` | 注册 ntfy 渠道（+2 行：引入 + 映射表添加） |
| `web/src/views/channels/List.vue` | 添加颜色、图标、描述文本（+3 处：colors/icons/说明文案） |

> **注意**：无需修改前端组件逻辑！前端的渠道列表、配置表单、测试发送等功能全部通过 `getChannelTypes()` API 动态获取，新增渠道零前端改动。

## 六、详细设计

### 渠道适配器 `ntfy.channel.js`

```javascript
const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * ntfy 渠道适配器
 *
 * ntfy 是一个轻量级的开源推送通知服务
 * 官网: https://ntfy.sh/
 * API 文档: https://docs.ntfy.sh/publish/
 *
 * 发送消息接口: POST {serverUrl}/{topic}
 * 鉴权方式: Authorization: Bearer {token}（可选，公共 Topic 可匿名）
 */
class NtfyChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} config.serverUrl - ntfy 服务端地址
   * @param {string} config.topic - Topic 名称
   * @param {string} [config.accessToken] - Access Token（可选）
   * @param {number|string} [config.priority] - 优先级 1-5，默认 3
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.serverUrl = config.serverUrl.replace(/\/+$/, '');
    this.topic = config.topic;
    this.accessToken = config.accessToken || '';
    // 解析优先级：支持数字(1-5) 和文本(min/low/default/high/max)
    this.priority = this._parsePriority(config.priority);
    this.channelId = channelId;
  }

  /**
   * 解析优先级值
   * ntfy 支持整数 1-5 和文本别名
   */
  _parsePriority(value) {
    if (!value && value !== 0) return 3; // default
    const map = {
      'min': 1, '1': 1,
      'low': 2, '2': 2,
      'default': 3, '3': 3,
      'high': 4, '4': 4,
      'max': 5, 'urgent': 5, '5': 5,
    };
    const normalized = String(value).trim().toLowerCase();
    if (map[normalized] !== undefined) return map[normalized];
    const num = parseInt(value);
    return (num >= 1 && num <= 5) ? num : 3;
  }

  async send(message) {
    const { title, content, type = 'text', url } = message;
    let text = content;

    // HTML → 纯文本
    if (type === 'html') {
      text = this._stripHtml(text);
    }

    // 构建请求 Headers
    const headers = {
      'Content-Type': type === 'markdown' ? 'text/markdown' : 'text/plain',
    };

    // 鉴权
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // 标题
    if (title) {
      headers['Title'] = title;
    }

    // 优先级
    if (this.priority !== 3) {
      headers['Priority'] = this.priority;
    }

    // Markdown 模式（当 type=markdown 时启用）
    if (type === 'markdown') {
      headers['Markdown'] = 'yes';
    }

    // 点击跳转（利用 MagicPush 消息的 url 字段）
    if (url) {
      headers['Click'] = url;
    }

    logger.info(`ntfy 发送消息: server=${this.serverUrl}, topic=${this.topic}, priority=${this.priority}`);

    const response = await axios.post(
      `${this.serverUrl}/${this.topic}`,
      text,
      {
        headers,
        timeout: 15000,
      }
    );

    return response.data;
  }

  _stripHtml(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '\n')
      .replace(/<\/p>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  validate(config) {
    if (!config.serverUrl || config.serverUrl.trim() === '') {
      return { valid: false, message: '服务器地址不能为空' };
    }
    try {
      new URL(config.serverUrl);
    } catch {
      return { valid: false, message: '服务器地址格式不正确' };
    }
    if (!config.topic || config.topic.trim() === '') {
      return { valid: false, message: 'Topic 不能为空' };
    }
    // Topic 名称合法性检查（ntfy 建议：只允许字母、数字、下划线、连字符）
    if (!/^[a-zA-Z0-9_\-]+$/.test(config.topic.trim())) {
      return { valid: false, message: 'Topic 只能包含字母、数字、下划线和连字符' };
    }
    return { valid: true, message: '' };
  }

  async test() {
    try {
      await this.send({
        title: '测试消息',
        content: '这是一条来自魔法推送(MagicPush)的测试消息 🎉',
        type: 'text',
      });
      return { success: true, message: '测试消息发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() {
    return 'ntfy';
  }

  static getDescription() {
    return '轻量级开源推送通知服务';
  }

  static getConfigFields() {
    return [
      {
        name: 'serverUrl',
        label: '服务器地址',
        type: 'text',
        required: true,
        placeholder: '如 https://ntfy.sh（公共云）或自托管地址',
        description: 'ntfy 服务端地址。公共云填 https://ntfy.sh 免费使用',
      },
      {
        name: 'topic',
        label: 'Topic 名称',
        type: 'text',
        required: true,
        placeholder: '如 myapp_alerts_prod',
        description: 'Topic 相当于频道名，也是访问凭证（选一个不易被猜到的名字）。只允许字母、数字、下划线、连字符',
      },
      {
        name: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: false,
        placeholder: '自托管且开启认证时填写',
        description: 'Access Token 用于身份验证。使用公共云 ntfy.sh 时通常不需要',
      },
      {
        name: 'priority',
        label: '消息优先级',
        type: 'select',
        required: false,
        placeholder: '默认 default(3)',
        options: [
          { label: '1 - Min（静默）', value: '1' },
          { label: '2 - Low（低）', value: '2' },
          { label: '3 - Default（正常，推荐）', value: '3' },
          { label: '4 - High（高）', value: '4' },
          { label: '5 - Max/urgent（紧急）', value: '5' },
        ],
        description: '控制手机通知的振动和声音方式。日常消息建议用 Default',
      },
    ];
  }
}

module.exports = NtfyChannel;
```

### 前端 UI 配置

| 属性 | 值 | 备注 |
|------|-----|------|
| 渠道名称 | ntfy | 与 `getName()` 返回值一致 |
| 渠道描述 | 轻量级开源推送通知服务 | 与 `getDescription()` 一致 |
| 颜色 | `bg-cyan-500` | ntfy 品牌色偏青色 |
| 图标 | `Bell` | lucide-vue-next 的 Bell 图标（通知类通用图标） |

### channels/List.vue 修改点

```javascript
// getChannelColor 中添加:
ntfy: 'bg-cyan-500',

// getChannelIcon 中添加:
ntfy: Bell,

// 顶部的渠道类型说明文案中添加 "· ntfy"
```

### channels/index.js 注册

```javascript
// 文件顶部引入
const NtfyChannel = require('./ntfy.channel');

// channelAdapters 映射中添加
const channelAdapters = {
  // ... 已有渠道
  ntfy: NtfyChannel,
};
```

## 七、实现复杂度评估

ntfy 是一个极简的通知渠道：

- **API 极其简单**：POST 到 `/{topic}`，Body 就是文本，Header 传递元数据
- **无 Token 刷新机制**：Token 是静态的，一次配置长期有效（甚至可以为空）
- **无会话/频道创建流程**：Topic 自动随首次发布创建，无需预创建
- **无需单独 client 文件**：直接在 channel 中调用 axios
- **优先级处理稍复杂**：需要兼容数字和文本两种格式（但逻辑简单）
- **预计代码量**：~160 行（含注释、HTML 剥离工具方法、优先级解析）

## 八、测试计划

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| **渠道注册** | `GET /api/channels/types` 包含 `ntfy` | 列表中出现 "ntfy - 轻量级开源推送通知服务" |
| **创建渠道** | 填写 serverUrl=https://ntfy.sh, topic=mytest_xxx | 渠道创建成功 |
| **文本推送** | 推送纯文本消息 | 手机/浏览器客户端收到通知 |
| **Markdown 推送** | 推送 Markdown 格式消息 | 客户端正确渲染粗体/链接等 |
| **HTML 推送** | 推送 HTML 内容 | HTML 标签被剥离，显示纯文本 |
| **带标题推送** | 设置 title 参数 | 通知标题显示为设置的标题（而非 Topic URL） |
| **优先级 default** | priority=3（或不设） | 正常振动+声音 |
| **优先级 max** | priority=5 | 全屏弹窗+持续振动 |
| **优先级 min** | priority=1 | 静默通知 |
| **点击跳转** | 消息带 url 字段 | 点击通知打开对应网页 |
| **测试按钮** | 点击渠道卡片的「测试」菜单 | 发送成功提示 |
| **无效地址** | 使用错误的服务器地址 | 返回明确的网络错误 |
| **空 Topic** | Topic 留空 | 校验失败："Topic 不能为空" |
| **非法 Topic** | Topic 含中文/特殊字符 | 校验失败："Topic 只能包含字母..." |
| **公共云免 Token** | 不填 Access Token，使用 ntfy.sh | 正常推送成功 |
| **自托管带 Token** | 填写自托管地址和 Token | 正常推送成功（需实际环境验证） |

## 九、注意事项 & 风险点

### 9.1 安全性

- **公开 Topic 的安全性**：Topic 名称就是唯一的安全屏障。如果 Topic 名过于简单（如 `test`, `alert`），任何人都可以向该 Topic 推送消息或订阅监听。
  - **缓解措施**：在配置字段的 placeholder 和 description 中引导用户使用复杂 Topic 名称
  - **代码层面校验**：validate() 中检查 Topic 格式（虽然 ntfy 本身不做限制，但我们引导用户使用安全的命名规范）

### 9.2 ntfy.sh 公共云限制

| 限制项 | 限额 | 影响 |
|--------|------|------|
| 消息保留时长 | ~12 小时（可配置） | 仅影响历史查看，不影响实时推送 |
| 消息大小 | 4,096 字节（纯文本）/ 15MB（附件） | 一般消息不会超限 |
| 速率限制 | 未公开精确数值，约每 IP 每分钟数十条 | 正常推送不受影响 |
| 邮件转发 | 免费用户 5 封/天/IP | 我们暂不实现此功能，故无影响 |

### 9.3 Topic 名称中的特殊字符

ntfy Topic 可以包含任意 UTF-8 字符（除了 `/`），但为了 URL 安全性和最佳实践：
- 建议限制为 `[a-zA-Z0-9_-]`
- 避免使用 `/`（会被当作路径分隔符导致 404）
- 避免使用空格（URL 编码问题）
- validate() 中做正则校验

## 十、未来扩展可能性（不在本次实现范围内）

以下特性 ntfy 支持但本次不实现，可作为后续增强：

| 特性 | 实现方式 | 价值 |
|------|----------|------|
| **Tags 标签** | 添加 `tags` 配置字段 → `X-Tags` Header | 通知分类和视觉标识（如 ⚠️ 警告、✅ 成功） |
| **Action Buttons** | 添加 `actions` 配置字段（JSON） → `X-Actions` Header | 通知内嵌操作按钮（如"确认"/"忽略"） |
| **定时投递** | 添加 `delay` 配置字段 → `X-Delay` Header | 延迟推送、定时提醒 |
| **邮件转发** | 添加 `email` 配置字段 → `X-Email` Header | 多通道同时告警 |
| **附件** | 利用 `url` 字段或新增 `attachUrl` 字段 → `X-Attach` Header | 图片/文件推送 |

## 十一、参考资源

- ntfy 官网: https://ntfy.sh/
- ntfy API 文档（发布消息）: https://docs.ntfy.sh/publish/
- ntfy 安装/自托管: https://docs.ntfy.sh/install/
- ntfy 客户端下载: https://docs.ntfy.sh/subscribe/phone/
- ntfy GitHub: https://github.com/binwiederhier/ntfy
- Docker 部署: `docker run -it -p 8080:80 binwiederhier/ntfy`
- ntfy CLI 安装: 见官网文档各平台安装方式
