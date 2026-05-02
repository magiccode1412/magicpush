# 微信龙虾机器人（wechatclawbot）渠道开发计划

> 渠道类型标识：`wechatclawbot`
> 创建日期：2026-03-22
> 更新日期：2026-03-22

---

## 目录

- [一、需求概述](#一需求概述)
- [二、核心设计决策](#二核心设计决策)
- [三、整体架构](#三整体架构)
- [四、涉及文件清单](#四涉及文件清单)
- [五、开发阶段](#五开发阶段)
  - [阶段一：后端开发](#阶段一后端开发)
  - [阶段二：前端开发](#阶段二前端开发)
- [六、详细设计](#六详细设计)
  - [6.1 ilink API 客户端](#61-ilink-api-客户端)
  - [6.2 渠道适配器](#62-渠道适配器)
  - [6.3 绑定流程控制器](#63-绑定流程控制器)
  - [6.4 前端绑定组件](#64-前端绑定组件)
- [七、配置字段设计](#七配置字段设计)
- [八、数据库设计](#八数据库设计)
- [九、测试计划](#九测试计划)
- [十、已知风险与待确认项](#十已知风险与待确认项)

---

## 一、需求概述

将微信官方 ClawBot（ilink API）作为新的通知渠道集成到 MagicPush，允许用户通过微信个人号接收推送消息。

**核心能力**：
- 用户通过 Web 端扫码登录绑定微信 ClawBot
- 绑定后自动获取 token 和用户 ID，无需手动填写
- 支持向绑定用户推送文本消息

**核心约束**：
- 用户**无法**主动获取 token / user_id，所有信息必须通过扫码绑定由后端从微信 API 获取
- 绑定路由放在渠道管理子路由下（`/api/channels/clawbot/...`）
- 不做消息监听（长轮询 getupdates），保持架构简洁

---

## 二、核心设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| 配置获取方式 | 仅扫码绑定，无手动输入 | 用户无法主动获取 token/user_id |
| 绑定路由 | `/api/channels/clawbot/bind/*` | 作为渠道管理的子功能 |
| 渠道创建方式 | 绑定成功后由后端自动创建 | 绑定流程完成后直接创建渠道，无需用户额外填写表单 |
| 用户 ID 获取 | 绑定确认时从微信 API 获取 | 扫码确认响应中包含 `ilink_user_id` |
| 消息监听 | 不实现 | 个人使用场景下绑定用户即为推送目标，无需额外捕获 |

**渠道创建流程对比**：

```
现有渠道流程：
  选择渠道类型 → 填写配置表单 → 保存 → 测试

微信龙虾机器人流程：
  选择渠道类型 → 扫码绑定 → 自动创建渠道（配置由后端填充）
```

---

## 三、整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      MagicPush Web                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  渠道管理页 - 微信龙虾机器人                       │   │
│  │  ┌──────────────────────────────────────────┐    │   │
│  │  │  [添加微信龙虾机器人]                      │    │   │
│  │  │  ┌─────────────────┐                     │    │   │
│  │  │  │  扫码绑定弹窗     │                     │    │   │
│  │  │  │  [QR 码图片]     │                     │    │   │
│  │  │  │  状态: 等待扫码   │                     │    │   │
│  │  │  └─────────────────┘                     │    │   │
│  │  └──────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│                   MagicPush Server                       │
│                                                          │
│  ┌──────────────────┐  ┌───────────────┐                │
│  │ 绑定控制器        │  │ 渠道适配器     │                │
│  │ ClawbotController │  │ Wechatclaw-   │                │
│  │ (新增)           │  │ botChannel    │                │
│  │ /channels/clawbot│  │ (新增)        │                │
│  │  /bind/*         │  │               │                │
│  └────────┬─────────┘  └──────┬────────┘                │
│           │                   │                          │
│  ┌────────▼───────────────────▼──────────────────────┐  │
│  │           ilink API 客户端 (新增)                   │  │
│  │  getQRCode / pollQRStatus / sendTextMessage       │  │
│  └────────────────────┬──────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼──────────────────────────────────┐
│          微信 ilink API (ilinkai.weixin.qq.com)            │
│                                                          │
│  ilink/bot/get_bot_qrcode    获取登录二维码               │
│  ilink/bot/get_qrcode_status 轮询扫码状态                │
│  ilink/bot/sendmessage       发送消息                     │
└──────────────────────────────────────────────────────────┘
```

---

## 四、涉及文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `server/src/services/clawbot/ilink-client.js` | ilink API 客户端（HTTP 封装） |
| `server/src/services/channels/wechatclawbot.channel.js` | 渠道适配器（推送逻辑） |
| `server/src/controllers/clawbot.controller.js` | 绑定流程控制器 |
| `server/src/routes/clawbot.routes.js` | 绑定流程路由 |
| `web/src/components/ClawbotBindDialog.vue` | 扫码绑定弹窗组件 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `server/src/services/channels/index.js` | 注册 wechatclawbot 渠道（+3 行） |
| `server/src/middleware/validator.middleware.js` | 白名单添加 `wechatclawbot`（+1 行） |
| `server/src/routes/channel.routes.js` | 挂载 clawbot 子路由（+2 行） |
| `web/src/api/channel.js` | 添加 clawbot 绑定 API 调用（+4 行） |
| `web/package.json` | 添加 `qrcode.vue` 依赖（+1 行） |

---

## 五、开发阶段

### 阶段一：后端开发

**工作量**：约 1.5-2 小时

#### 1.1 创建 ilink API 客户端

文件：`server/src/services/clawbot/ilink-client.js`

封装与微信 ilink API 的 HTTP 交互，**仅实现三个方法**（不包含 getUpdates）：

```javascript
class IlinkClient {
  constructor({ baseUrl = 'https://ilinkai.weixin.qq.com', token }) { ... }

  // 获取绑定二维码
  async getQRCode() { ... }

  // 轮询扫码状态
  async pollQRStatus(qrcode) { ... }

  // 发送文本消息
  async sendTextMessage({ toUserId, text, contextToken }) { ... }
}
```

**关键实现细节**：

- 基础 URL：`https://ilinkai.weixin.qq.com`
- 请求头：
  ```javascript
  {
    'Content-Type': 'application/json',
    'AuthorizationType': 'ilink_bot_token',
    'Authorization': `Bearer ${token}`,
    'X-WECHAT-UIN': randomWechatUin(),  // 随机 uint32 -> base64
  }
  ```
- `sendTextMessage` 请求体：
  ```javascript
  {
    msg: {
      from_user_id: '',
      to_user_id: toUserId,
      client_id: generateClientId(),
      message_type: 2,    // BOT
      message_state: 2,   // FINISH
      item_list: [{ type: 1, text_item: { text } }],
      context_token: contextToken || undefined,
    },
    base_info: { channel_version: '1.0.0' },
  }
  ```

#### 1.2 创建渠道适配器

文件：`server/src/services/channels/wechatclawbot.channel.js`

```javascript
class WechatclawbotChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.token = config.token;
    this.toUserId = config.toUserId;
    this.baseUrl = config.baseUrl || 'https://ilinkai.weixin.qq.com';
    this.contextToken = config.contextToken;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    let text = title ? `${title}\n\n${content}` : content;

    // Markdown/HTML 剥离格式标记，转为纯文本
    if (type === 'markdown') {
      text = stripMarkdown(text);
    } else if (type === 'html') {
      text = stripHtml(text);
    }

    const client = new IlinkClient({ baseUrl: this.baseUrl, token: this.token });
    return client.sendTextMessage({
      toUserId: this.toUserId,
      text,
      contextToken: this.contextToken,
    });
  }

  validate(config) {
    if (!config.token) return { valid: false, message: 'Bot Token 不能为空' };
    if (!config.toUserId) return { valid: false, message: '推送用户 ID 不能为空' };
    return { valid: true, message: '' };
  }

  async test() {
    try {
      await this.send({
        title: '测试消息',
        content: '这是一条来自魔法推送的测试消息',
        type: 'text',
      });
      return { success: true, message: '测试消息发送成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static getName() { return '微信龙虾机器人'; }
  static getDescription() { return '通过微信 ClawBot 推送消息到个人微信'; }

  // 返回空配置字段 —— 所有配置通过扫码绑定自动获取
  static getConfigFields() { return []; }
}
```

> **注意**：`getConfigFields()` 返回空数组，因为这个渠道的所有配置（token、toUserId）都通过扫码绑定自动获取，用户无需手动填写任何内容。

#### 1.3 注册渠道

修改 `server/src/services/channels/index.js`：

```javascript
const WechatclawbotChannel = require('./wechatclawbot.channel');

const channelAdapters = {
  // ... 已有渠道 ...
  wechatclawbot: WechatclawbotChannel,
};

module.exports = {
  // ... 已有导出 ...
  WechatclawbotChannel,
};
```

修改 `server/src/middleware/validator.middleware.js` 白名单：

```javascript
.isIn([..., 'wechatclawbot'])
```

#### 1.4 创建绑定控制器

文件：`server/src/controllers/clawbot.controller.js`

```javascript
class ClawbotController {
  /**
   * 获取绑定二维码
   * 调用 ilink/bot/get_bot_qrcode，返回二维码 URL 给前端
   */
  async getQRCode(req, res) { ... }

  /**
   * 轮询扫码状态
   * 调用 ilink/bot/get_qrcode_status
   * confirmed 时返回 token、botId、userId
   */
  async getQRStatus(req, res) { ... }

  /**
   * 绑定确认 —— 创建渠道
   * 扫码确认后，前端带着 token/userId/botId 调用此接口
   * 后端自动创建 wechatclawbot 渠道，配置由后端填充
   */
  async bindChannel(req, res) { ... }

  /**
   * 重新绑定
   * 用户可以重新扫码获取新的 token，更新已有渠道配置
   */
  async rebindChannel(req, res) { ... }
}
```

**`bindChannel` 核心逻辑**：

```javascript
async bindChannel(req, res) {
  const { token, botId, userId, baseUrl } = req.body;

  // 调用 ChannelService.createChannel 创建渠道
  const channel = await ChannelService.createChannel(req.user.userId, {
    type: 'wechatclawbot',
    name: '微信龙虾机器人',
    config: {
      token,
      toUserId: userId,        // 扫码用户即推送目标
      botId,
      baseUrl: baseUrl || 'https://ilinkai.weixin.qq.com',
    },
  });

  return ResponseUtil.created(res, channel, '绑定成功');
}
```

#### 1.5 创建绑定路由

文件：`server/src/routes/clawbot.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const clawbotController = require('../controllers/clawbot.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// 绑定二维码
router.post('/bind/qrcode', clawbotController.getQRCode);
router.get('/bind/status', clawbotController.getQRStatus);
router.post('/bind/confirm', clawbotController.bindChannel);
router.put('/bind/:channelId/rebind', clawbotController.rebindChannel);

module.exports = router;
```

#### 1.6 挂载路由

修改 `server/src/routes/channel.routes.js`，在 `/:id` 路由之前挂载 clawbot 子路由：

```javascript
const clawbotRoutes = require('./clawbot.routes');

// ... 现有路由 ...

// 微信龙虾机器人绑定路由（必须在 /:id 之前，避免路径冲突）
router.use('/clawbot', clawbotRoutes);

// 获取单个渠道（/:id 在 clawbot 之后）
router.get('/:id', ...);
```

#### 1.7 后端验证

- 启动服务，确认 `GET /api/channels/types` 返回 `wechatclawbot`
- 确认 `POST /api/channels/clawbot/bind/qrcode` 路由可达
- 确认 `GET /api/channels/clawbot/bind/status` 路由可达
- 确认 `POST /api/channels/clawbot/bind/confirm` 能创建渠道

---

### 阶段二：前端开发

**工作量**：约 2-2.5 小时

#### 2.1 安装依赖

```bash
cd web
pnpm add qrcode.vue
```

#### 2.2 添加 API 调用

修改 `web/src/api/channel.js`，添加 clawbot 绑定相关 API：

```javascript
// 微信龙虾机器人绑定
export const getClawbotQRCode = () => request.post('/channels/clawbot/bind/qrcode')
export const getClawbotQRStatus = (qrcode) => request.get('/channels/clawbot/bind/status', { params: { qrcode } })
export const clawbotBindConfirm = (data) => request.post('/channels/clawbot/bind/confirm', data)
export const clawbotRebind = (channelId, data) => request.put(`/channels/clawbot/bind/${channelId}/rebind`, data)
```

#### 2.3 创建扫码绑定弹窗组件

文件：`web/src/components/ClawbotBindDialog.vue`

**核心交互流程**：

```
┌─────────────────────────────────┐
│       微信龙虾机器人绑定          │
│                                 │
│   请使用微信扫描下方二维码         │
│                                 │
│   ┌─────────────────────┐      │
│   │                     │      │
│   │    [QR 码图片]       │      │
│   │                     │      │
│   └─────────────────────┘      │
│                                 │
│   状态: 等待扫码...             │
│                                 │
│   ┌──────────┐                  │
│   │ 刷新二维码 │                  │
│   └──────────┘                  │
└─────────────────────────────────┘
```

**状态机**：

```
idle → loading → (显示二维码) → polling
                                       │
                                  ┌────┼────────┐
                                  ▼    ▼        ▼
                               wait  scaned   confirmed
                                                │
                                                ▼
                                          (调用 bind/confirm
                                           自动创建渠道)
                                 expired ──→ (提示重新获取)
```

**Props**：

| Prop | Type | 说明 |
|------|------|------|
| `visible` | Boolean | 控制弹窗显示 |
| `mode` | String | `'create'`（新建绑定）或 `'rebind'`（重新绑定） |
| `channelId` | Number | 重新绑定时传入的渠道 ID |

**Events**：

| Event | Payload | 说明 |
|-------|---------|------|
| `update:visible` | Boolean | 关闭弹窗 |
| `success` | Channel Object | 绑定成功，渠道已创建/更新 |

**核心逻辑**：

```vue
<script setup>
import { ref, watch, onUnmounted } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { getClawbotQRCode, getClawbotQRStatus, clawbotBindConfirm, clawbotRebind } from '@/api/channel'

const props = defineProps({
  visible: Boolean,
  mode: { type: String, default: 'create' },
  channelId: Number,
})
const emit = defineEmits(['update:visible', 'success'])

const qrCodeUrl = ref('')
const qrcodeId = ref('')
const status = ref('idle')  // idle | loading | polling | scaned | confirmed | expired
const botData = ref({})     // 存储确认后的 token/botId/userId
let pollTimer = null

// 弹窗打开时自动获取二维码
watch(() => props.visible, (val) => {
  if (val) fetchQRCode()
  else cleanup()
})

async function fetchQRCode() {
  status.value = 'loading'
  const res = await getClawbotQRCode()
  qrCodeUrl.value = res.qrcodeUrl
  qrcodeId.value = res.qrcode
  status.value = 'polling'
  startPolling()
}

function startPolling() {
  pollTimer = setInterval(async () => {
    const res = await getClawbotQRStatus(qrcodeId.value)
    switch (res.status) {
      case 'scaned':
        status.value = 'scaned'
        break
      case 'confirmed':
        status.value = 'confirmed'
        clearInterval(pollTimer)
        botData.value = res
        await confirmBind()
        break
      case 'expired':
        status.value = 'expired'
        clearInterval(pollTimer)
        break
    }
  }, 2000)
}

async function confirmBind() {
  let res
  if (props.mode === 'rebind') {
    res = await clawbotRebind(props.channelId, botData.value)
  } else {
    res = await clawbotBindConfirm(botData.value)
  }
  emit('success', res)
  emit('update:visible', false)
}

function cleanup() {
  clearInterval(pollTimer)
  status.value = 'idle'
  qrCodeUrl.value = ''
}

onUnmounted(cleanup)
</script>
```

#### 2.4 集成到渠道管理页面

在渠道管理页面中，当用户选择 `wechatclawbot` 类型时，**不显示配置表单**，而是直接弹出扫码绑定弹窗：

```
用户操作流程：

[渠道列表页] → 点击"添加渠道"
    → 下拉选择"微信龙虾机器人"
    → 弹出 ClawbotBindDialog
    → 用户扫码
    → 绑定成功，渠道自动创建
    → 弹窗关闭，渠道列表刷新
```

渠道编辑页面中，`wechatclawbot` 类型渠道的编辑操作：

- 显示只读配置信息（botId、toUserId、绑定时间等）
- 提供"重新绑定"按钮，点击后弹出 `ClawbotBindDialog(mode='rebind')`
- 重新绑定会更新 token 和 userId

#### 2.5 前端验证

- 渠道类型列表中出现"微信龙虾机器人"
- 点击添加后弹出扫码弹窗，QR 码正确渲染
- 未扫码时状态显示"等待扫码"
- 扫码后状态更新为"已扫码，请确认"
- 确认后渠道自动创建，列表刷新
- 二维码过期后可点击刷新
- 已有渠道可重新绑定

---

## 六、详细设计

### 6.1 ilink API 客户端

**文件**：`server/src/services/clawbot/ilink-client.js`

```javascript
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../../utils/logger');

const DEFAULT_BASE_URL = 'https://ilinkai.weixin.qq.com';
const BOT_TYPE = '3';

class IlinkClient {
  constructor({ baseUrl = DEFAULT_BASE_URL, token }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  /**
   * 生成随机 X-WECHAT-UIN 头（随机 uint32 -> base64）
   */
  _randomUin() {
    const uint32 = crypto.randomBytes(4).readUInt32BE(0);
    return Buffer.from(String(uint32), 'utf-8').toString('base64');
  }

  /**
   * 生成随机 client_id（UUID v4）
   */
  _generateClientId() {
    return crypto.randomUUID();
  }

  /**
   * 构建请求头
   */
  _headers() {
    return {
      'Content-Type': 'application/json',
      'AuthorizationType': 'ilink_bot_token',
      'X-WECHAT-UIN': this._randomUin(),
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
    };
  }

  /**
   * 获取绑定二维码
   * GET ilink/bot/get_bot_qrcode?bot_type=3
   * @returns {{ qrcode: string, qrcodeUrl: string }}
   */
  async getQRCode() {
    const { data } = await axios.get(`${this.baseUrl}/ilink/bot/get_bot_qrcode`, {
      params: { bot_type: BOT_TYPE },
      headers: this._headers(),
      timeout: 15000,
    });
    return {
      qrcode: data.qrcode,                 // 二维码标识符（用于轮询状态）
      qrcodeUrl: data.qrcode_img_content,  // 二维码内容（URL 字符串）
    };
  }

  /**
   * 轮询扫码状态
   * GET ilink/bot/get_qrcode_status?qrcode=xxx
   * @returns {{ status: string, token?: string, botId?: string, userId?: string, baseUrl?: string }}
   */
  async pollQRStatus(qrcode) {
    const { data } = await axios.get(`${this.baseUrl}/ilink/bot/get_qrcode_status`, {
      params: { qrcode },
      headers: this._headers(),
      timeout: 15000,
    });

    const statusMap = {
      0: 'wait',      // 等待扫码
      1: 'scaned',    // 已扫码待确认
      2: 'confirmed', // 已确认
      3: 'expired',   // 已过期
      4: 'canceled',  // 已取消
    };

    const result = { status: statusMap[data.status] || 'wait' };

    if (data.status === 2) {
      // confirmed，提取绑定信息
      result.token = data.bot_token || data.token;
      result.botId = data.ilink_bot_id;
      result.userId = data.ilink_user_id;
      result.baseUrl = data.baseurl || DEFAULT_BASE_URL;
    }

    return result;
  }

  /**
   * 发送文本消息
   * POST ilink/bot/sendmessage
   */
  async sendTextMessage({ toUserId, text, contextToken }) {
    const body = {
      msg: {
        from_user_id: '',
        to_user_id: toUserId,
        client_id: this._generateClientId(),
        message_type: 2,
        message_state: 2,
        item_list: [{ type: 1, text_item: { text } }],
      },
      base_info: { channel_version: '1.0.0' },
    };

    // context_token 设为可选，根据 Python SDK 判断 API 不强制要求
    if (contextToken) {
      body.msg.context_token = contextToken;
    }

    const { data } = await axios.post(`${this.baseUrl}/ilink/bot/sendmessage`, body, {
      headers: this._headers(),
      timeout: 15000,
    });

    return data;
  }
}

module.exports = IlinkClient;
```

### 6.2 渠道适配器

**文件**：`server/src/services/channels/wechatclawbot.channel.js`

适配器仅负责消息推送，配置字段通过扫码绑定自动填充。

**消息类型处理**：

| 输入 type | 处理方式 |
|-----------|---------|
| `text` | 直接作为文本发送（标题+正文拼接） |
| `markdown` | 剥离 Markdown 格式标记，转为纯文本 |
| `html` | 剥离 HTML 标签，转为纯文本 |

**推送目标**：绑定用户（`toUserId`），由绑定流程自动获取。

### 6.3 绑定流程控制器

**文件**：`server/src/controllers/clawbot.controller.js`

**绑定流程时序图**：

```
前端                     后端                       微信 ilink API
 │                        │                            │
 │── POST /bind/qrcode ──▶│                            │
 │                        │── GET get_bot_qrcode ─────▶│
 │                        │◀── { qrcode, url } ────────│
 │◀── { qrcode, url } ───│                            │
 │                        │                            │
 │  [渲染二维码图片]       │                            │
 │                        │                            │
 │── GET /bind/status ──▶│                            │
 │   ?qrcode=xxx          │── GET get_qrcode_status ──▶│
 │                        │◀── { status: 'wait' } ────│
 │◀── { status: wait } ──│                            │
 │  (继续轮询, 2s 间隔)   │                            │
 │                        │                            │
 │── GET /bind/status ──▶│                            │
 │                        │── GET get_qrcode_status ──▶│
 │                        │◀── { status: 'confirmed',  │
 │                        │     bot_token, bot_id,     │
 │                        │     user_id, baseurl } ───│
 │◀── { status: confirmed,│                            │
 │     token, botId,     │                            │
 │     userId } ─────────│                            │
 │                        │                            │
 │── POST /bind/confirm ─▶│                            │
 │  { token, botId,      │                            │
 │    userId, baseUrl }   │  (调用 ChannelService      │
 │                        │   创建渠道并填充 config)    │
 │◀── { channel } ───────│                            │
 │                        │                            │
 │  (渠道列表刷新)        │                            │
```

**API 路由汇总**：

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/channels/clawbot/bind/qrcode` | JWT | 获取绑定二维码 |
| GET | `/api/channels/clawbot/bind/status` | JWT | 轮询扫码状态 |
| POST | `/api/channels/clawbot/bind/confirm` | JWT | 确认绑定并创建渠道 |
| PUT | `/api/channels/clawbot/bind/:channelId/rebind` | JWT | 重新绑定已有渠道 |

### 6.4 前端绑定组件

**文件**：`web/src/components/ClawbotBindDialog.vue`

支持两种模式：
- **create**：新建绑定，调用 `/bind/confirm` 创建渠道
- **rebind**：重新绑定已有渠道，调用 `/bind/:id/rebind` 更新配置

使用 Element Plus 的 `el-dialog` + `qrcode.vue` 渲染二维码。

轮询间隔：2 秒。二维码过期后提示用户刷新。

---

## 七、配置字段设计

`getConfigFields()` 返回空数组，因为所有配置通过扫码绑定自动获取。

渠道 config JSON 结构：

```json
{
  "token": "bot_token_from_qr_scan",
  "toUserId": "oXXXXXXXX@im.wechat",
  "botId": "ilink_bot_id",
  "baseUrl": "https://ilinkai.weixin.qq.com",
  "contextToken": "from_first_message_if_available"
}
```

| 字段 | 说明 | 来源 |
|------|------|------|
| `token` | Bot Token | 扫码绑定确认时获取 |
| `toUserId` | 推送目标用户 ID（扫码用户） | 扫码绑定确认时获取 |
| `botId` | ClawBot ID | 扫码绑定确认时获取 |
| `baseUrl` | API 地址 | 扫码绑定确认时获取，默认 `https://ilinkai.weixin.qq.com` |
| `contextToken` | 上下文 Token（可选） | 推送时如 API 需要，后续可扩展 |

---

## 八、数据库设计

**无需新增表**。利用现有 `channels` 表的 `config` JSON 字段存储所有配置，与现有渠道保持一致。

渠道记录示例：

| id | user_id | type | name | config (JSON) |
|----|---------|------|------|---------------|
| 1 | 1 | wechatclawbot | 微信龙虾机器人 | `{"token":"xxx","toUserId":"oXX@im.wechat","botId":"yyy","baseUrl":"https://..."}` |

---

## 九、测试计划

### 9.1 后端测试

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| 渠道注册 | `GET /api/channels/types` 包含 `wechatclawbot` | 列表中出现"微信龙虾机器人" |
| 获取二维码 | `POST /api/channels/clawbot/bind/qrcode` | 返回 `{ qrcode, qrcodeUrl }` |
| 轮询等待 | `GET /api/channels/clawbot/bind/status?qrcode=xxx`（未扫码） | 返回 `{ status: 'wait' }` |
| 轮询确认 | 扫码确认后再次轮询 | 返回 `{ status: 'confirmed', token, botId, userId }` |
| 创建渠道 | `POST /api/channels/clawbot/bind/confirm` | 渠道创建成功，config 中包含 token/toUserId |
| 消息推送 | 使用已绑定渠道调用推送 | 微信收到消息 |
| 无效 token | 使用过期 token 推送 | 返回错误，记录日志 |

### 9.2 前端测试

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| 渠道类型展示 | 渠道列表下拉选择 | 出现"微信龙虾机器人"选项 |
| 扫码弹窗 | 选择 wechatclawbot 后 | 弹出绑定弹窗，QR 码正确渲染 |
| 扫码状态 | 未扫码时 | 显示"等待扫码" |
| 扫码确认 | 微信扫码并确认 | 状态更新，渠道自动创建，列表刷新 |
| 二维码过期 | 超时不扫码 | 显示"已过期"，可刷新 |
| 重新绑定 | 编辑已有渠道，点击重新绑定 | 弹出绑定弹窗，完成后更新渠道配置 |

### 9.3 端到端测试

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| 完整推送流程 | 创建渠道 → 绑定 → 通过 API 推送消息 | 微信收到推送文本 |
| 测试按钮 | 渠道详情页点击测试 | 发送测试消息，微信收到 |
| 渠道编辑 | 重新绑定后再次推送 | 使用新 token 推送成功 |

---

## 十、已知风险与待确认项

### 已知风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Token 可能过期 | 推送失败 | 推送失败时返回明确错误提示，引导用户重新绑定 |
| 单实例限制 | 同一微信号不能同时用于其他 ClawBot 应用 | 文档说明 |
| 仅支持 iOS | Android/PC 用户无法绑定 | 前端提示系统要求 |
| context_token 可能必需 | 无 context_token 时推送可能失败 | 适配器做 fallback：先不带 token 发送，失败后提示需先在微信中与 Bot 对话 |
| API 处于 preview 阶段 | 接口可能变更 | 代码层面做错误处理和降级 |
| 确认响应字段名不确定 | `bot_token` / `ilink_bot_id` 等字段名需实测 | 开发时打印完整响应，按实际字段名适配 |

### 待确认项

1. **context_token 是否必需**：需要实测。建议先用不带 `context_token` 的方式发送消息，确认 API 是否接受。

2. **Token 有效期**：需实测。如果长期有效则绑定是一次性操作；如果频繁过期，需在推送失败时提示重新绑定。

3. **确认响应字段名**：`pollQRStatus` 在 confirmed 状态下返回的字段名（如 `bot_token` vs `token`、`ilink_bot_id` vs `bot_id`），需根据实际 API 响应调整。

4. **推送频率限制**：ilink API 是否有发送频率限制，需关注。
