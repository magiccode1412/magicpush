# iGot 通知渠道 - 开发计划

> 状态：**待实现**
> 创建日期：2026-05-06

## 一、概述

[iGot](https://push.hellyw.com) 是一个开放式通知推送服务平台，支持 iOS 和 Android 设备推送。用户只需一个 Key 即可将消息推送到手机。

**核心特点**：
- **极简 API**：仅需 `POST https://push.hellyw.com/{key}`，JSON body
- **免费公共云服务**：官方提供 `https://push.hellyw.com/` 免费在线版
- **支持自定义扩展参数**：除 title/content 外可传递额外字段
- **无需安装 APP（iOS）**：iOS 用户通过快捷指令接收
- **Android 需安装 App**：需从官网下载 Android 客户端
- **响应简洁**：`ret=0` 成功，`ret≠0` 失败 + errMsg 说明

## 二、iGot API 信息

### 2.1 发送消息 API

```
POST https://push.hellyw.com/{key}
Content-Type: application/json
```

> **注意**：Key 是 URL 路径的一部分，不是 query 参数或 header。

**请求体（JSON）**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 消息标题 |
| `content` | string | 是 | 消息正文内容 |
| 其他字段 | any | 否 | 可传递额外自定义参数 |

### 2.2 调用示例

```bash
# 发送消息
curl -X POST "https://push.hellyw.com/{你的key}" \
  -H "Content-Type: application/json" \
  -d '{"title":"服务器告警","content":"CPU使用率达到90%"}'
```

### 2.3 响应体格式

**成功**：
```json
{
  "ret": 0,
  "data": {}
}
```

**失败**：
```json
{
  "ret": 201,
  "data": {},
  "errMsg": "请使用系统分配的有效key"
}
```

| 字段 | 说明 |
|------|------|
| `ret` | `0` 表示成功，非 0 表示错误（如 201 = 无效 key） |
| `data` | 返回数据（通常为空对象） |
| `errMsg` | 错误信息（仅失败时存在） |

### 2.4 消息类型处理

iGot 的 API 较为简单，只接受 JSON 格式的 `title` + `content`：

| 输入 type | iGot 处理方式 |
|-----------|---------------|
| `text` | `title`=截取前20字或空, `content`=完整内容 |
| `markdown` | `title`=title, `content`=Markdown 原文传递（客户端渲染能力取决于客户端） |
| `html` | 剥离 HTML 标签转为纯文本后按 text 方式发送 |

## 三、用户配置流程

### 方式一：获取 Key（推荐）

1. 访问 [iGot 官网](https://push.hellyw.com/doc/#/) 注册账号
2. 登录后进入「控制台」→ 获取分配的 Key
3. 将 Key 填入 MagicPush 渠道配置

### 方式二：iOS 快捷指令

1. 在 iPhone 上添加 iGot 快捷指令
2. 配置时填入分配的 Key
3. 通过快捷指令触发接收消息

## 四、实现方案

### 设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| **推送方式** | POST JSON 到 `/key` | iGot 唯一的推送接口，标准用法 |
| **默认服务地址** | `https://push.hellyw.com` | 官方公共云，用户零配置即可使用 |
| **鉴权方式** | URL Path 中的 key | key 直接拼接在 URL 路径中 |
| **消息格式** | JSON `{title, content}` | iGot 接受的标准格式 |
| **无新增依赖** | 直接用 axios | 与现有架构一致 |

### 配置字段设计

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `serverUrl` | text | 否 | API 地址，默认 `https://push.hellyw.com`（官方公共云） |
| `key` | text | **是** | iGot 分配的 Key，用于身份验证和路由 |

### 为什么 key 作为必填配置？

- key 是 iGot **唯一的鉴权凭证**，且作为 URL 路径的一部分
- 没有 key 无法构造有效的请求 URL
- 每个 key 对应用户账户，泄露风险低
- 类似 PushDeer 的 pushKey 设计模式

## 五、涉及文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `server/src/services/channels/igot.channel.js` | 渠道适配器（逻辑简单，~100 行含注释） |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `server/src/services/channels/index.js` | 注册 igot 渠道（+2 行：引入 + 映射表添加） |
| `server/src/middleware/validator.middleware.js` | 白名单添加 `igot`（+1 处） |
| `web/src/views/channels/List.vue` | 添加颜色、图标、描述文本、文档链接（+4~5 处） |
| `web/src/views/About.vue` | 支持的渠道列表添加 iGot（+1 处） |
| `README.md` | 消息渠道列表和频率限制表添加 iGot（+2 处） |

> **注意**：无需修改前端组件逻辑！前端的渠道列表、配置表单、测试发送等功能全部通过 `getChannelTypes()` API 动态获取。

## 六、详细设计

### 渠道适配器 `igot.channel.js`

```javascript
const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * iGot 渠道适配器
 *
 * iGot 是一个开放式通知推送服务平台
 * 官网: https://push.hellyw.com
 * 文档: https://push.hellyw.com/doc/#/
 *
 * 发送消息接口: POST {serverUrl}/{key} (JSON)
 * 鉴权方式: URL Path 中的 key
 */
class IGotChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} [config.serverUrl] - API 地址，默认官方公共云
   * @param {string} config.key - iGot 分配的 Key
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.serverUrl = (config.serverUrl && config.serverUrl.trim())
      ? config.serverUrl.replace(/\/+$/, '')
      : 'https://push.hellyw.com';
    this.key = config.key;
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    // 构建请求体
    let body;

    if (type === 'markdown') {
      body = {
        title: title || '',
        content: content,
      };
    } else if (type === 'html') {
      const text = this._stripHtml(content);
      body = {
        title: title ? title.slice(0, 20) : '',
        content: title ? `${title}\n${text}` : text,
      };
    } else {
      // 纯文本模式
      body = {
        title: title ? title.slice(0, 20) : '',
        content: title ? `${title}\n${content}` : content,
      };
    }

    logger.info(`iGot 发送消息: server=${this.serverUrl}, type=${type}`);

    const response = await axios.post(
      `${this.serverUrl}/${this.key}`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    // iGot 返回 ret=0 为成功
    const data = response.data;
    if (data.ret !== 0) {
      throw new Error(data.errMsg || `iGot 推送失败 (ret=${data.ret})`);
    }

    return data;
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
    if (config.serverUrl && config.serverUrl.trim() !== '') {
      try {
        new URL(config.serverUrl);
      } catch {
        return { valid: false, message: '服务器地址格式不正确' };
      }
    }
    if (!config.key || config.key.trim() === '') {
      return { valid: false, message: 'Key 不能为空' };
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
    return 'igot';
  }

  static getDescription() {
    return '开放式通知推送服务（iOS/Android）';
  }

  static getConfigFields() {
    return [
      {
        name: 'serverUrl',
        label: 'API 地址',
        type: 'text',
        required: false,
        placeholder: '默认 https://push.hellyw.com（官方公共云）',
        description: 'iGot API 地址。留空则使用官方公共服务',
      },
      {
        name: 'key',
        label: 'Key',
        type: 'text',
        required: true,
        placeholder: '请填写 iGot 分配的 Key',
        description: '在 iGot 控制台获取的 Key，用于身份验证',
      },
    ];
  }
}

module.exports = IGotChannel;
```

### 前端 UI 配置

| 属性 | 值 | 备注 |
|------|-----|------|
| 渠道名称 | igot | 与 `getName()` 返回值一致 |
| 渠道描述 | 开放式通知推送服务（iOS/Android） | 与 `getDescription()` 一致 |
| 颜色 | `bg-indigo-500` | iGot 品牌色调 |
| 图标 | `Send` | lucide-vue-next（推送的寓意） |

### channels/List.vue 修改点

```javascript
// getChannelColor 中添加:
igot: 'bg-indigo-500',

// getChannelIcon 中添加:
igot: Send,

// 顶部的渠道类型说明文案中追加 "· iGot"
```

### 弹窗底部文档链接（参考 ntfy/PushDeer 实现）

当选择 iGot 渠道类型时，弹窗 footer 显示相关文档链接：

- iGot 官方文档: https://push.hellyw.com/doc/#/
- iGot 官网: https://push.hellyw.com

### channels/index.js 注册

```javascript
// 文件顶部引入
const IGotChannel = require('./igot.channel');

// channelAdapters 映射中添加
const channelAdapters = {
  // ... 已有渠道
  igot: IGotChannel,
};
```

### validator.middleware.js 白名单

```javascript
// createChannelValidation 的 isIn 数组中添加 'igot'
.isIn(['wechatclawbot', 'wecom', /* ... */, 'igot'])
```

## 七、实现复杂度评估

iGot 是最简单的通知渠道之一：

- **仅 1 个 API 接口**（`POST /{key}`）
- **Key 即鉴权**（URL Path，无 Token 刷新机制）
- **无会话/频道概念**
- **请求格式简单**：JSON body，标准 HTTP
- **预计代码量**：~95 行（含注释和辅助方法）

复杂度低于 PushDeer（不需要 form-urlencoded），与 Gotify 相近。

## 八、测试计划

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| **渠道注册** | `GET /api/channels/types` 包含 `igot` | 列表中出现 "iGot - 开放式通知推送服务" |
| **创建渠道（官方云）** | serverUrl 留空，填写 key | 渠道创建成功 |
| **创建渠道（自托管）** | 填写自架地址 + key | 渠道创建成功 |
| **文本推送** | 推送纯文本消息 | 手机收到文本通知 |
| **Markdown 推送** | 推送 Markdown 格式消息 | 客户端收到 Markdown 内容 |
| **HTML 推送** | 推送 HTML 内容 | HTML 标签被剥离，显示纯文本 |
| **带标题推送** | 设置 title + content | 通知中显示标题和正文 |
| **测试按钮** | 点击渠道卡片的「测试」菜单 | 发送成功提示 |
| **无效 Key** | 使用错误的 Key | 返回 ret=201 + errMsg |
| **空 Key** | Key 留空 | 校验失败："Key 不能为空" |
| **无效地址** | 使用错误的自架地址 | 返回网络错误 |

## 九、注意事项 & 风险点

### 9.1 公共云稳定性

- iGot 公共云由个人/小团队维护，稳定性不如大厂服务
- 建议同时配置其他渠道（如 Server酱、ntfy）作为备份
- 高频推送场景建议关注限流情况

### 9.2 Key 安全性

- Key 作为 URL 路径的一部分，可能出现在访问日志中
- 建议不要将包含 Key 的 URL 分享给他人
- 如怀疑 Key 泄露，可在 iGot 控制台重新生成

### 9.3 与 PushPlus 的关系

- iGot 和 PushPlus 功能类似（都是国内通用推送服务）
- iGot 更轻量，API 更简单（只有 title + content）
- PushPlus 支持更多模板和渠道选择
- 可根据用户偏好选择使用

### 9.4 URL 路径中的 Key 注意

iGot 的 Key 是直接拼接在 URL 路径中的（`{serverUrl}/{key}`），而非 query 参数：
- 需要对 Key 做 URL encode 处理（防止特殊字符导致路径解析异常）
- 构造 URL 时确保没有多余的斜杠
- 如果 Key 包含斜杠等字符需要编码

## 十、参考资源

- iGot 官网: https://push.hellyw.com
- iGot 文档站: https://push.hellyw.com/doc/#/
- 统一推送库（含 iGot 实现）: https://github.com/HCLONELY/ALL-PUSHER-API
