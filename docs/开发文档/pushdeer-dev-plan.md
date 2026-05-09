# PushDeer 通知渠道 - 开发计划

> 状态：**待实现**
> 创建日期：2026-05-06

## 一、概述

[PushDeer](https://github.com/easychen/pushdeer) 是一个开源的无 APP 推送服务，支持 iOS 轻应用（App Clip）、iOS/Mac/Android 客户端、快应用等多种端。用户只需一个 URL 即可将消息推送到手机或桌面设备。

**核心特点**：
- **无 APP 方案**：iOS 14+ 用户通过轻应用（App Clip）扫码即可使用，无需安装
- **极简 API**：仅一个推送接口 `POST /message/push`，form-urlencoded 参数
- **支持 Markdown**：消息正文支持 Markdown 渲染（默认格式）
- **支持图片推送**：通过图片 URL 发送图片通知
- **公共云服务**：官方提供 `https://api2.pushdeer.com` 免费在线版
- **自托管友好**：Docker 一键部署（Laravel + Go push 微服务）
- **多端覆盖**：iOS、Mac、Android、快应用、自制设备（DeerESP）

> ⚠️ 注意：PushDeer 项目已停止维护（客户端和 API 不再更新），但官方 API 服务器仍持续服务。适合作为轻量推送渠道补充。

## 二、PushDeer API 信息

### 2.1 发送消息 API

```
POST {serverUrl}/message/push
Content-Type: application/x-www-form-urlencoded
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pushkey` | string | 是 | PushKey，多个 key 用逗号分隔。在线版最多 10 个，自架版默认最多 100 个 |
| `text` | string | 是 | 推送内容。type=markdown 时为标题；type=image 时为图片 URL |
| `desp` | string | 否 | 消息第二部分（正文）。markdown 类型时放 Markdown 内容 |
| `type` | string | 否 | 消息格式：`text`（文本）、`markdown`（Markdown，**默认值**）、`image`（图片） |

### 2.2 调用示例

**发送文字（GET 简单方式）**：
```
GET https://api2.pushdeer.com/message/push?pushkey={key}&text=要发送的内容&type=text
```

**发送 Markdown（POST 推荐）**：
```
POST https://api2.pushdeer.com/message/push
Content-Type: application/x-www-form-urlencoded

pushkey={key}&text=标题&desp=**Markdown正文**&type=markdown
```

**发送图片**：
```
POST https://api2.pushdeer.com/message/push
Content-Type: application/x-www-form-urlencoded

pushkey={key}&text=https://example.com/image.png&type=image
```

### 2.3 响应体格式

```json
{
  "code": 0,
  "content": {
    "result": [...]
  }
}
```

| 字段 | 说明 |
|------|------|
| `code` | `0` 表示成功，非 0 表示错误 |
| `content` | 成功时的返回内容 |
| `error` | 错误时的错误信息（code 非 0 时存在） |

### 2.4 消息类型处理

| 输入 type | PushDeer 处理方式 |
|-----------|-------------------|
| `text` | `type=text`, `text`=content |
| `markdown` | `type=markdown`, `text`=title(或截取前50字), `desp`=content |
| `html` | 剥离 HTML 标签转为纯文本后按 text 方式发送 |

## 三、用户配置流程

### 方式一：使用官方在线版（推荐）

1. 在 iPhone/iPad 上安装 [PushDeer](https://apps.apple.com/app/pushdeer/id1559217879)（或使用轻 App 扫码）
2. 使用 Apple ID 登录
3. 切换到「设备」标签页 → 点击右上角加号 → 注册当前设备
4. 切换到「Key」标签页 → 点击右上角加号 → 创建一个 Key
5. 复制生成的 PushKey URL 或 Key 值填入 MagicPush

### 方式二：自托管

1. Docker 部署：
```bash
git clone https://github.com/easychen/pushdeer.git
cd pushdeer
docker-compose -f docker-compose.self-hosted.yml up --build -d
```
2. 访问 `{服务器IP}:8800` 完成初始化
3. 安装「PushDeer·自架版」客户端，连接到自架服务器
4. 登录后创建 Device 和 Key
5. 将自架服务器地址和 PushKey 填入 MagicPush

## 四、实现方案

### 设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| **推送方式** | POST form-urlencoded 到 `/message/push` | PushDeer 唯一的推送接口，标准用法 |
| **默认服务地址** | `https://api2.pushdeer.com` | 官方公共云，用户零配置即可使用 |
| **鉴权方式** | `pushkey` 参数 | PushDeer 的唯一鉴权机制 |
| **消息格式** | 根据 input type 自动映射 | text→text, markdown→markdown(title+desp), html→strip后text |
| **Markdown 映射** | title → `text`, content → `desp` | PushDeer markdown 模式下 text 为标题、desp 为正文 |
| **无新增依赖** | 直接用 axios | 与现有架构一致 |

### 配置字段设计

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `serverUrl` | text | 否 | PushDeer API 地址，默认 `https://api2.pushdeer.com`（官方公共云） |
| `pushKey` | text | 是 | PushKey，在 PushDeer 客户端的「Key」标签页创建 |

### 为什么 pushKey 作为必填配置？

- PushKey 是 PushDeer **唯一的鉴权凭证**，没有它无法推送
- 每个 PushKey 绑定到特定用户的设备列表
- 用户可能创建多个 Key 用于不同用途（如 `server_alerts`、`deploy_notify`）
- PushKey 泄露风险低：即使泄露也只能推送到该用户自己注册的设备上

## 五、涉及文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `server/src/services/channels/pushdeer.channel.js` | 渠道适配器（逻辑简单，~120 行含注释） |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `server/src/services/channels/index.js` | 注册 pushdeer 渠道（+2 行：引入 + 映射表添加） |
| `server/src/middleware/validator.middleware.js` | 白名单添加 `pushdeer`（+1 处） |
| `web/src/views/channels/List.vue` | 添加颜色、图标、描述文本（+3~4 处） |
| `web/src/views/About.vue` | 支持的渠道列表添加 PushDeer（+1 处） |

> **注意**：无需修改前端组件逻辑！前端的渠道列表、配置表单、测试发送等功能全部通过 `getChannelTypes()` API 动态获取。

## 六、详细设计

### 渠道适配器 `pushdeer.channel.js`

```javascript
const axios = require('axios');
const BaseChannel = require('./base.channel');
const logger = require('../../utils/logger');

/**
 * PushDeer 渠道适配器
 *
 * PushDeer 是一个开源的无APP推送服务
 * 官网: https://github.com/easychen/pushdeer
 * API 文档: 见仓库 api 目录
 *
 * 发送消息接口: POST {serverUrl}/message/push (form-urlencoded)
 * 鉴权方式: pushkey 参数
 */
class PushDeerChannel extends BaseChannel {
  /**
   * @param {Object} config - 渠道配置
   * @param {string} [config.serverUrl] - API 地址，默认官方公共云
   * @param {string} config.pushKey - PushKey
   * @param {number} channelId - 渠道记录 ID
   */
  constructor(config, channelId) {
    super(config);
    this.serverUrl = (config.serverUrl && config.serverUrl.trim())
      ? config.serverUrl.replace(/\/+$/, '')
      : 'https://api2.pushdeer.com';
    this.pushKey = config.pushKey;
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;

    // 构建请求参数
    const params = new URLSearchParams();
    params.append('pushkey', this.pushKey);

    if (type === 'markdown') {
      // Markdown 模式: text=标题, desp=Markdown正文
      params.append('type', 'markdown');
      params.append('text', title || '');
      params.append('desp', content);
    } else if (type === 'html') {
      // HTML 先剥离标签转为纯文本
      const text = this._stripHtml(content);
      params.append('type', 'text');
      params.append('text', title ? `${title}\n${text}` : text);
    } else {
      // 纯文本模式: text=完整内容（标题+正文拼接）
      params.append('type', 'text');
      params.append('text', title ? `${title}\n${content}` : content);
    }

    logger.info(`PushDeer 发送消息: server=${this.serverUrl}, type=${type}`);

    const response = await axios.post(
      `${this.serverUrl}/message/push`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      }
    );

    // PushDeer 返回 code=0 为成功
    const data = response.data;
    if (data.code !== 0) {
      throw new Error(data.error || `PushDeer 推送失败 (code=${data.code})`);
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
    if (!config.pushKey || config.pushKey.trim() === '') {
      return { valid: false, message: 'PushKey 不能为空' };
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
    return 'pushdeer';
  }

  static getDescription() {
    return '开源无APP推送服务（iOS/Android/Mac）';
  }

  static getConfigFields() {
    return [
      {
        name: 'serverUrl',
        label: 'API 地址',
        type: 'text',
        required: false,
        placeholder: '默认 https://api2.pushdeer.com（官方公共云）',
        description: 'PushDeer API 地址。留空则使用官方公共云（免费）。自托管请填写自架服务器地址',
      },
      {
        name: 'pushKey',
        label: 'PushKey',
        type: 'text',
        required: true,
        placeholder: '如 PDUxxxxx...',
        description: '在 PushDeer 客户端「Key」标签页创建获取。每个 Key 可绑定不同设备组合',
      },
    ];
  }
}

module.exports = PushDeerChannel;
```

### 前端 UI 配置

| 属性 | 值 | 备注 |
|------|-----|------|
| 渠道名称 | pushdeer | 与 `getName()` 返回值一致 |
| 渠道描述 | 开源无APP推送服务（iOS/Android/Mac） | 与 `getDescription()` 一致 |
| 颜色 | `bg-orange-500` | PushDeer Logo 偏橙黄色 |
| 图标 | `Smartphone` | lucide-vue-next（多端覆盖的寓意） |

### channels/List.vue 修改点

```javascript
// getChannelColor 中添加:
pushdeer: 'bg-orange-500',

// getChannelIcon 中添加:
pushdeer: Smartphone,

// 顶部的渠道类型说明文案中追加 "· PushDeer"
```

### 弹窗底部文档链接（参考 ntfy 实现）

当选择 PushDeer 渠道类型时，弹窗 footer 显示相关文档链接：

- PushDeer GitHub: https://github.com/easychen/pushdeer
- API 文档: https://github.com/easychen/pushdeer/blob/main/doc/README.md
- 自架部署指南: https://github.com/easychen/pushdeer#使用自架服务器端和自架版客户端

### channels/index.js 注册

```javascript
// 文件顶部引入
const PushDeerChannel = require('./pushdeer.channel');

// channelAdapters 映射中添加
const channelAdapters = {
  // ... 已有渠道
  pushdeer: PushDeerChannel,
};
```

### validator.middleware.js 白名单

```javascript
// createChannelValidation 的 isIn 数组中添加 'pushdeer'
.isIn(['wechatclawbot', 'wecom', /* ... */, 'pushdeer'])
```

## 七、实现复杂度评估

PushDeer 是最简单的通知渠道之一：

- **仅 1 个 API 接口**（`POST /message/push`）
- **无 Token 刷新机制**（PushKey 是静态的，一次创建长期有效）
- **无会话/频道概念**（不像 QQ Bot 需要创建会话）
- **无需单独 client 文件**（直接在 channel 中调用 axios）
- **请求格式简单**：form-urlencoded，无需 JSON/Header 拼装
- **预计代码量**：~110 行（含注释和辅助方法）

## 八、测试计划

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| **渠道注册** | `GET /api/channels/types` 包含 `pushdeer` | 列表中出现 "PushDeer - 开源无APP推送服务" |
| **创建渠道（官方云）** | serverUrl 留空，填写 pushKey | 渠道创建成功 |
| **创建渠道（自托管）** | 填写自架地址 + pushKey | 渠道创建成功 |
| **文本推送** | 推送纯文本消息 | 手机/桌面客户端收到文本通知 |
| **Markdown 推送** | 推送 Markdown 格式消息 | 客户端正确渲染标题 + Markdown 正文 |
| **HTML 推送** | 推送 HTML 内容 | HTML 标签被剥离，显示纯文本 |
| **带标题推送** | 设置 title + content | 通知中显示标题和正文拼接结果 |
| **测试按钮** | 点击渠道卡片的「测试」菜单 | 发送成功提示 |
| **无效 PushKey** | 使用错误的 PushKey | 返回错误（code ≠ 0） |
| **空 PushKey** | PushKey 留空 | 校验失败："PushKey 不能为空" |
| **无效地址** | 使用错误的自架地址 | 返回网络错误 |

## 九、注意事项 & 风险点

### 9.1 项目维护状态

- PushDeer **已停止维护**（客户端和 API 不再更新新功能）
- 官方 API 服务器**仍在运行**，可正常使用
- 如需长期稳定方案，建议同时配置其他渠道（如 Server酱、ntfy）作为备份
- 自架版本需**每年更新推送证书**（每年 2 月），否则推送失效

### 9.2 公共云限制

| 限制项 | 限额 | 影响 |
|--------|------|------|
| 单次推送 key 数量 | 最多 10 个 | 一般场景够用 |
| 消息频率 | 未公开精确限制 | 正常推送不受影响 |
| 图片大小 | 取决于 CDN | 大图可能较慢 |

### 9.3 与 Server酱的关系

- PushDeer 可以**接入 Server酱** 作为通道使用（Server酱 后台可选 PushDeer 作为转发目标）
- 但本项目是**直接对接 PushDeer API**，不经过 Server酱 中转
- 减少一跳中转，延迟更低

### 9.4 Markdown 模式的字段映射注意

PushDeer 的 markdown 模式比较特殊：
- `text` 字段存放**标题**
- `desp` 字段存放 **Markdown 正文**
- 这与 ntfy/Gotify 的"整个 body 就是消息体"不同
- 实现时需要将 MagicPush 的 `title` → `text`，`content` → `desp`

## 十、未来扩展可能性（不在本次实现范围内）

以下特性 PushDeer 支持但本次不实现：

| 特性 | 实现方式 | 价值 |
|------|----------|------|
| **图片推送** | 新增 imageMode 配置，type=image, text=图片URL | 直接推送图片通知 |
| **多 Key 推送** | pushKey 支持逗号分隔的多个 key | 同时推送到多组设备 |

## 十一、参考资源

- PushDeer GitHub: https://github.com/easychen/pushdeer
- PushDeer Gitee（国内镜像）: https://gitee.com/easychen/pushdeer
- API 文档（Swagger）: 仓库 `doc` 目录 / 在线 Demo
- iOS 客户端（App Store）: 搜索 "PushDeer"
- Docker 部署: `docker-compose -f docker-compose.self-hosted.yml up --build -d`
- Python SDK by Gao Liang: 见仓库 README
- Go SDK by Luoxin: 见仓库 README
