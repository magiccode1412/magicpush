# 腾讯元宝 Bot 接入 MagicPush 通知渠道 - 技术调研报告

> 调研日期: 2026-05-01
> 目标: 将腾讯元宝 Bot 作为新的通知渠道接入 MagicPush 平台

---

## 一、核心发现

**腾讯元宝 Bot** 是腾讯官方推出的 AI 助手平台，已提供 OpenClaw 官方插件（`Tencent/yuanbao-openclaw-plugin`），采用 **WebSocket + Protobuf** 协议通信。

### 官方资源
- **GitHub 仓库**: https://github.com/Tencent/yuanbao-openclaw-plugin
- **OpenClaw 要求**: 版本 2026.4.10 或以上
- **协议**: WebSocket 长连接 + Protobuf 二进制
- **状态**: production-ready（支持私聊 + 群聊）

---

## 二、技术架构对比

| 特性 | 微信龙虾机器人 (现有) | 腾讯元宝 Bot (新增) |
|------|---------------------|-------------------|
| **通信协议** | HTTP REST API | WebSocket 长连接 |
| **认证方式** | 扫码绑定获取 Token | appKey + appSecret |
| **消息格式** | JSON | Protobuf 二进制 |
| **连接模式** | 无状态请求 | 有状态长连接 + 心跳 |
| **推送限制** | 10条/24小时 | 未发现明确限制 |
| **支持消息类型** | 文本 | 文本/图片/文件/音频/视频/贴纸 |
| **双向通信** | 仅发送 + 长轮询接收 | 全双工通信 |

---

## 三、元宝 Bot 核心技术细节

### 3.1 认证配置

```javascript
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",        // 从元宝应用创建机器人获取
      appSecret: "your_app_secret",  // 应用密钥
    }
  }
}
```

**Token 格式**: `appKey:appSecret`（冒号分隔）

**获取方式**:
1. 打开腾讯元宝 App
2. 进入应用设置/机器人管理
3. 创建新机器人
4. 获取 App Key 和 App Secret

### 3.2 WebSocket 连接流程

```
┌─────────┐     ┌──────────┐     ┌──────────────┐
│  Client  │     │ Gateway  │     │ Yuanbao Server│
└────┬─────┘     └────┬─────┘     └──────┬───────┘
     │                │                  │
     │── 1. WebSocket Connect ──────────▶ │
     │                │                  │
     │◀── Connection Established ─────── │
     │                │                  │
     │── 2. AuthBind (appKey+token) ───▶│
     │    { bizId, uid, source, token }  │
     │                │                  │
     │◀── AuthBindRsp { connectId } ────│
     │                │                  │
     │── 3. Start Heartbeat (5s) ──────▶│
     │                │                  │
     │◀── PingRsp { heartInterval } ────│   ← 循环心跳
     │                │                  │
     │── 4. SendC2CMessage ────────────▶│   → 业务消息
     │◀── SendMessageRsp ──────────────│
     │                │                  │
     │◀── PushMsg (cmdType=2) ─────────│   ← 接收消息
     │                │                  │
```

### 3.3 关键技术参数

```javascript
// 连接配置
const CONFIG = {
  // 心跳
  HEARTBEAT_INTERVAL_FIRST: 5_000,      // 首次心跳延迟: 5秒
  HEARTBEAT_TIMEOUT_THRESHOLD: 2,       // 连续2次未收到ACK触发重连

  // 重连策略
  RECONNECT_DELAYS: [1_000, 2_000, 5_000, 10_000, 30_000, 60_000],
  MAX_RECONNECT_ATTEMPTS: 100,          // 最大重连次数

  // 消息
  SEND_TIMEOUT_MS: 30_000,              // 发送超时: 30秒
  MAX_MESSAGE_CHARS: 3000,              // 单条消息最大字符数

  // 不可重连的错误码
  NO_RECONNECT_CODES: [4012, 4013, 4014, 4018, 4019, 4021],
  // 4012: 版本封禁
  // 4013: 用户封禁
  // 4014: 同账号冲突
  // 4018: 账号封禁
  // 4019: 账号已删除
  // 4021: 设备移除

  // 认证失败码
  AUTH_FAILED_CODES: [41103, 41104, 41108],
  AUTH_ALREADY_CODE: 41101,             // 已认证成功码
};
```

### 3.4 消息发送方式

#### 私聊消息 (C2C)
```typescript
// 发送私聊消息
client.sendC2CMessage({
  to_account: "user_id",
  msg_body: {
    text: "消息内容"
    // 可选: 图片、文件等多媒体内容
  }
});

// 响应结构
{
  msgId: "uuid",
  code: 0,           // 0=成功
  message: ""        // 错误信息
}
```

#### 群聊消息
```typescript
// 发送群聊消息
client.sendGroupMessage({
  group_code: "group_id",
  msg_body: {
    text: "群消息内容"
  }
});
```

### 3.5 Protobuf 协议结构

#### 连接层消息 (ConnMsg)
```
ConnMsg:
├── head (PBHead)                    [必填]
│   ├── version: uint32              # 协议版本
│   ├── seqNo: uint32                # 序列号
│   ├── cmdType: uint32              # 0=请求 / 1=响应 / 2=推送 / 3=确认
│   ├── cmd: uint32                  # 命令类型 (见 CMD 枚举)
│   ├── msgId: string                # 消息ID (UUID去横杠)
│   ├── status: uint32               # 状态码 (0=成功)
│   └── needAck: bool               # 是否需要ACK
└── data: bytes                      # Protobuf 编码的业务数据
```

#### 命令枚举 (CMD)
```javascript
const CMD = {
  AuthBind: 1,         // 认证绑定
  Ping: 2,             // 心跳
  Kickout: 3,          // 踢出通知
};

const BIZ_CMD = {
  SendC2CMessage: "send_c2c_message",        // 发送私聊消息
  SendGroupMessage: "send_group_message",    // 发送群聊消息
  QueryGroupInfo: "query_group_info",        // 查询群信息
  GetGroupMemberList: "get_group_member_list", // 获取成员列表
  SendPrivateHeartbeat: "send_private_heartbeat", // 私聊心跳
  SendGroupHeartbeat: "send_group_heartbeat",    // 群聊心跳
  SyncInformation: "sync_information",          // 同步命令列表
};

const BIZ_MODULE = "yuanbao_openclaw_proxy";  // 固定模块名
```

#### 认证请求 (AuthBindReq)
```
AuthBindReq:
├── bizId: string          # 业务ID (从appKey派生)
├── uid: string            # 用户ID
├── source: string         # 来源标识
├── token: string          # 签名后的token
├── msgId: string          # 消息ID
├── routeEnv: string       # 路由环境
├── appVersion: string     # 插件版本
├── operationSystem: string # 操作系统
└── botVersion: string     # Bot版本
```

#### 认证响应 (AuthBindRsp)
```
AuthBindRsp:
├── code: number           # 0=成功, 41101=已认证, 其他=失败
├── message: string        # 错误信息
├── connectId: string      # 连接ID (用于日志追踪)
├── timestamp: number/string # 时间戳
└── clientIp: string       # 客户端IP
```

#### 心跳请求/响应
```
PingReq:
└── (空或时间戳)

PingRsp:
└── heartInterval: number  # 下次心跳间隔(秒), >1时更新本地间隔
```

#### 推送消息 (PushMsg)
```
PushMsg:
├── cmd: string            # 推送命令
├── module: string         # 模块名
├── msgId: string          # 消息ID
└── data: bytes            # 实际消息数据 (需二次解码)

DirectedPush:              // 简化版推送
├── type: number           # 类型
└── content: string        # 内容文本
```

#### 踢出通知 (KickoutMsg)
```
KickoutMsg:
├── status: number         # 状态码
├── reason: string         # 原因
└── otherDeviceName: string # 其他设备名
```

### 3.6 支持的消息类型

#### 接收消息 ✅
- ✅ 文本消息
- ✅ 图片
- ✅ 文件
- ✅ 音频/语音
- ✅ 视频
- ✅ 贴纸/自定义表情
- ✅ 自定义元素（链接卡片等）

#### 发送消息 ✅
- ✅ 文本（支持 Markdown）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频
- ✅ 贴纸

---

## 四、与现有 MagicPush 架构集成方案

### 4.1 现有龙虾机器人架构回顾

```
核心文件位置:
├── server/src/services/clawbot/
│   ├── ilink-client.js           # HTTP客户端 (微信ilink API)
│   └── clawbot-monitor.js        # 长轮询监控服务
├── server/src/services/channels/
│   ├── wechatclawbot.channel.js  # 渠道适配器 (继承BaseChannel)
│   └── index.js                  # 渠道注册中心
├── server/src/controllers/
│   └── clawbot.controller.js     # 绑定流程控制器
├── server/src/routes/
│   └── clawbot.routes.js         # 绑定专用路由
└── web/src/components/
    └── ClawbotBindDialog.vue     # 前端扫码绑定组件
```

**BaseChannel 基类接口**:
```javascript
class BaseChannel {
  constructor(config);
  async send(message);           // 子类实现: 发送消息
  validate(config);              // 子类实现: 验证配置
  async test();                  // 子类实现: 测试连接
  static getName();              // 子类实现: 返回渠道名称
  static getDescription();       // 返回描述文字
  static getConfigFields();      // 返回配置字段列表 (动态表单)
}
```

### 4.2 元宝 Bot 渠道架构设计

```
新建文件结构:
├── server/src/services/
│   ├── channels/
│   │   ├── yuanbot.channel.js       # 渠道适配器 (继承BaseChannel)
│   │   └── index.js                 # 注册: yuanbot: YuanbotChannel
│   └── yuanbot/
│       ├── ws-client.js            # WebSocket客户端封装
│       ├── proto-codec.js          # Protobuf编解码器
│       ├── auth.js                 # Token签名和认证逻辑
│       └── yuanbot-monitor.js      # 连接监控和生命周期管理
├── server/src/controllers/
│   └── yuanbot.controller.js       # 配置和测试控制器
├── server/src/routes/
│   └── yuanbot.routes.js           # API路由定义
└── web/src/components/
    └── YuanbotConfigDialog.vue     # 配置弹窗组件
```

### 4.3 核心模块设计

#### ws-client.js - WebSocket 客户端
```javascript
/**
 * YuanbaoWsClient - 元宝Bot WebSocket客户端
 *
 * 职责:
 * 1. 建立/维护WebSocket长连接
 * 2. 认证绑定 (AuthBind)
 * 3. 心跳保活 (自动重连)
 * 4. 发送业务消息 (sendC2CMessage/sendGroupMessage)
 * 5. 接收推送消息并分发
 */
class YuanbaoWsClient {
  constructor({ connectionConfig, callbacks });

  // 连接管理
  connect();
  disconnect();
  getState();  // 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'reconnecting'

  // 消息发送
  sendText(toAccount, text);           // 发送文本
  sendMedia(toAccount, mediaData);     // 发送媒体
  sendAndWait(cmd, module, data);      // 通用请求-响应模式

  // 回调事件
  callbacks: {
    onReady(connectInfo),      // 认证成功
    onClose(code, reason),     // 连接关闭
    onError(error),            // 错误
    onKickout(info),           // 被踢出
    onDispatch(pushEvent),     // 收到推送消息
    onStateChange(state),      // 状态变化
    onAuthFailed(errorCode),   // 认证失败(用于刷新token)
  };
}
```

#### proto-codec.js - Protobuf 编解码
```javascript
/**
 * Protobuf编解码器
 *
 * 注意: 官方插件使用protobufjs动态编译 .proto 文件
 * 简化实现可使用手动编码或protobufjs静态代码
 */

// 连接层编码/解码
function encodeConnMsg(head, data);     // 编码ConnMsg
function decodeConnMsg(binary);          // 解码ConnMsg
function buildAuthBindMsg(payload);      // 构建认证请求
function buildPingMsg(msgId);            // 构建心跳请求
function buildPushAck(head);             // 构建ACK响应

// 业务层编码/解码
function encodeSendC2CMessageReq(data);  // 编码私聊消息请求
function encodeSendGroupMessageReq(data);// 编码群聊消息请求
function decodeSendMessageRsp(data);     // 解码发送响应
function decodeInboundMessage(data);     // 解码接收到的消息
```

#### auth.js - 认证管理
```javascript
/**
 * Token签名和认证
 *
 * 流程:
 * 1. 使用 appKey + appSecret 生成签名 token
 * 2. token 可能有时效性，需要定期刷新
 * 3. 认证失败时触发刷新流程
 */
class YuanbaoAuthManager {
  constructor(appKey, appSecret);

  async getSignedToken();  // 获取签名后的token
  async refreshToken();    // 刷新token (如果过期)
}
```

#### yuanbot.channel.js - 渠道适配器
```javascript
/**
 * YuanbotChannel - 元宝Bot渠道适配器
 *
 * 继承BaseChannel, 实现标准渠道接口
 */
class YuanbotChannel extends BaseChannel {
  static getName() { return "腾讯元宝"; }
  static getDescription() { return "通过腾讯元宝Bot推送消息"; }

  static getConfigFields() {
    return [
      { name: "appKey", label: "App Key", type: "text", required: true },
      { name: "appSecret", label: "App Secret", type: "password", required: true },
      { name: "toUserId", label: "接收用户ID", type: "text", required: true },
    ];
  }

  async send(message) {
    const { title, content } = message;
    const text = title ? `${title}\n\n${content}` : content;

    // 获取或创建WS客户端实例
    const client = await this._getClient();

    // 发送消息
    return client.sendText(this.toUserId, text);
  }

  async test() {
    const client = await this._getClient();
    return client.sendText(this.toUserId, "【测试消息】MagicPush元宝Bot通道测试成功");
  }

  validate(config) {
    if (!config.appKey || !config.appSecret) throw new Error("缺少appKey或appSecret");
    if (!config.toUserId) throw new Error("缺少接收用户ID");
  }
}
```

#### yuanbot-monitor.js - 监控服务
```javascript
/**
 * YuanbotMonitor - 连接监控单例
 *
 * 职责:
 * 1. 管理所有yuanbot渠道的WS连接
 * 2. 统一的生命周期管理
 * 3. 连接状态持久化和恢复
 * 4. 异常告警和日志
 */
class YuanbotMonitor {
  static getInstance();

  addChannel(channelId, config);     // 添加渠道到监控
  removeChannel(channelId);          // 移除渠道
  getClient(channelId);              // 获取指定渠道的WS客户端
  getAllStatus();                    // 获取所有连接状态

  // 内部方法
  _startConnection(channelId);       // 启动连接
  _handleReconnect(channelId);       // 处理重连
  _handleDisconnect(channelId);      // 处理断开
}
```

### 4.4 关键差异点及处理策略

| 差异点 | 龙虾机器人处理方式 | 元宝Bot处理策略 |
|--------|------------------|---------------|
| **WebSocket vs HTTP** | 无状态HTTP调用 | 维护长连接池, 单例管理WS客户端 |
| **Protobuf vs JSON** | 直接JSON解析 | 引入protobufjs库或手写codec |
| **appKey认证 vs 扫码** | 扫码绑定零配置 | 用户手动填写appKey/appSecret |
| **双向通信** | 仅长轮询接收 | 可选实现消息接收(指令控制/回执) |
| **无推送限额** | 复杂的10条/24h额度管理 | 无需额度系统, 大幅简化 |
| **连接状态管理** | 无 | 需要监控服务管理连接生命周期 |

### 4.5 数据库设计

在现有 `channels` 表中添加新类型的 config 结构:

```sql
-- 新增 channel_type = 'yuanbot' 的记录
INSERT INTO channels (
  user_id, channel_type, name, config, is_active
) VALUES (
  ${userId},
  'yuanbot',
  '腾讯元宝Bot',
  '{
    "appKey": "your_app_key",
    "appSecret": "encrypted_app_secret",
    "toUserId": "target_user_id",
    "connectionStatus": "connected",
    "lastConnectedAt": 1746000000000,
    "connectId": "conn_xxx"
  }',
  1
);
```

**config 字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `appKey` | string | ✅ | 应用密钥ID |
| `appSecret` | string | ✅ | 应用密钥 (建议加密存储) |
| `toUserId` | string | ✅ | 目标用户ID |
| `connectionStatus` | string | ❌ | 运行时状态: connected/disconnecting/reconnecting |
| `lastConnectedAt` | number | ❌ | 上次连接时间戳 |
| `connectId` | string | ❌ | 当前连接ID |

---

## 五、开发路线图

### Phase 1: MVP 最小可用版本 ⚡
**目标**: 实现基础的文本消息推送功能

- [ ] 实现 `proto-codec.js` (Protobuf编解码基础)
- [ ] 实现 `auth.js` (Token签名)
- [ ] 实现 `ws-client.js` (WS连接 + 认证 + 心跳 + 发送消息)
- [ ] 实现 `yuanbot.channel.js` (渠道适配器, 继承BaseChannel)
- [ ] 在 `channels/index.js` 注册新渠道
- [ ] 实现 `yuanbot.controller.js` (测试连接API)
- [ ] 实现前端配置表单 `YuanbotConfigDialog.vue`
- [ ] 端到端测试: 创建渠道 -> 测试连接 -> 推送消息

### Phase 2: 稳定性增强 🛡️
**目标**: 生产级可靠性

- [ ] 实现 `yuanbot-monitor.js` (全局连接管理单例)
- [ ] 自动重连机制完善 (指数退避 + 最大重试次数)
- [ ] Token自动刷新机制
- [ ] 连接状态持久化 (重启后恢复连接)
- [ ] 多渠道并发支持 (多个元宝bot同时运行)
- [ ] 日志和监控指标 (连接数、消息数、错误率)

### Phase 3: 功能扩展 🚀
**目标**: 完整功能集

- [ ] 多媒体消息支持 (图片/文件/音频/视频)
- [ ] 群聊消息推送
- [ ] Markdown格式消息渲染
- [ ] 消息接收和处理 (用于指令控制)
- [ ] Webhook回调 (接收消息后转发)
- [ ] 连接状态仪表盘展示
- [ ] 推送统计和分析

---

## 六、参考资源

### 官方文档
- **GitHub仓库**: https://github.com/Tencent/yuanbao-openclaw-plugin
- **README**: 包含完整的配置示例和故障排查指南
- **源码结构**:
  ```
  src/
  ├── channel.ts              # 主插件入口 (渠道注册)
  ├── access/ws/
  │   ├── client.ts           # WS客户端完整实现 ⭐️ 重点参考
  │   ├── gateway.ts          # 网关启动和管理
  │   ├── conn-codec.ts       # 连接层Protobuf编解码
  │   └── biz-codec.ts        # 业务层Protobuf编解码
  ├── business/
  │   ├── actions/            # 消息动作处理
  │   └── tools/              # 工具函数
  └── types.ts                # TypeScript类型定义
  ```

### 项目内部参考
- **龙虾机器人实现**: `/workspace/server/src/services/clawbot/`
  - `ilink-client.js` - HTTP客户端封装模式
  - `clawbot-monitor.js` - 长轮询监控模式
- **渠道基类**: `/workspace/server/src/services/channels/base.channel.js`
- **渠道注册中心**: `/workspace/server/src/services/channels/index.js`
- **推送服务**: `/workspace/server/src/services/push.service.js`
- **开发计划文档**: `/workspace/docs/wechatclawbot-dev-plan.md`

### 相关依赖
```json
{
  "dependencies": {
    "ws": "^8.x",              // WebSocket客户端
    "protobufjs": "^7.x"       // Protobuf运行时 (可选, 也可手写codec)
  }
}
```

---

## 七、风险和注意事项

### 技术风险
⚠️ **Protobuf兼容性**: 官方使用 `.proto` 文件动态编译，需要确保 schema 一致
⚠️ **Token时效性**: appSecret签名的token可能有过期机制，需实现刷新逻辑
⚠️ **连接稳定性**: WebSocket长连接在网络不稳定环境下可能频繁断连，需健壮的重连机制
⚠️ **并发限制**: 同一账号多设备登录可能触发踢出 (code 4014)，需避免重复连接

### 运维建议
📌 **监控关键指标**: 连接数、重连频率、消息发送成功率/延迟
📌 **日志策略**: 开启 `debugBotIds` 进行问题排查
📌 **密钥安全**: appSecret 必须加密存储，避免明文落库
📌 **灰度发布**: 先在小范围测试，再逐步推广到所有用户

---

## 八、快速开始模板

当准备开始开发时，可以直接复制以下代码框架:

```javascript
// server/src/services/channels/yuanbot.channel.js
const BaseChannel = require('./base.channel');
// TODO: 导入其他依赖

class YuanbotChannel extends BaseChannel {
  constructor(config) {
    super(config);
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.toUserId = config.toUserId;
    this.wsClient = null;  // 延迟初始化
  }

  static getName() {
    return '腾讯元宝';
  }

  static getDescription() {
    return '通过腾讯元宝Bot推送消息，支持文本和多媒体';
  }

  static getConfigFields() {
    return [
      {
        name: 'appKey',
        label: 'App Key',
        type: 'text',
        placeholder: '从元宝应用获取',
        required: true,
        description: '在元宝App中创建机器人后获得'
      },
      {
        name: 'appSecret',
        label: 'App Secret',
        type: 'password',
        placeholder: '输入应用密钥',
        required: true,
        description: '请妥善保管，不要泄露'
      },
      {
        name: 'toUserId',
        label: '接收用户ID',
        type: 'text',
        placeholder: '输入目标用户的元宝ID',
        required: true,
        description: '消息接收者的用户标识'
      }
    ];
  }

  validate(config) {
    if (!config.appKey || !config.appSecret) {
      throw new Error('缺少必要的认证信息: appKey 和 appSecret');
    }
    if (!config.toUserId) {
      throw new Error('缺少接收用户ID (toUserId)');
    }
  }

  async test() {
    try {
      // TODO: 测试连接
      const result = await this.send({
        title: '测试消息',
        content: 'MagicPush 腾讯元宝Bot 渠道测试成功！如果您收到此消息，说明配置正确。',
        type: 'text'
      });
      return { success: true, message: '测试成功', result };
    } catch (error) {
      throw new Error(`测试失败: ${error.message}`);
    }
  }

  async send(message, options = {}) {
    const { title, content, type = 'text' } = message;
    let text = title ? `${title}\n\n${content}` : content;

    // TODO: 实现实际的消息发送逻辑
    // 1. 获取或创建 WS 客户端
    // 2. 确保连接处于活跃状态
    // 3. 调用 sendC2CMessage 发送消息
    // 4. 处理响应和错误

    console.log(`[YuanBot] Sending to ${this.toUserId}:`, text.substring(0, 50));

    // 临时占位符 - 替换为实际实现
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      channel: 'yuanbot'
    };
  }
}

module.exports = YuanbotChannel;
```

---

> **下一步**: 当准备好继续开发时，可以基于本文档快速启动实现。
> 建议从 Phase 1 (MVP) 开始，先跑通核心链路，再逐步增强功能。
