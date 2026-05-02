# 腾讯元宝 Bot 接入 MagicPush 通知渠道 - 开发进度报告

> 最后更新: 2026-05-02
> 状态: **后端核心已完成，正在联调签名认证 (code=10097 已修复待验证)**

---

## 一、当前开发进度总览

### 已完成 (Phase 1 核心链路 + 部分 Phase 2)

| 模块 | 文件 | 行数 | 状态 | 说明 |
|------|------|------|------|------|
| Protobuf 编解码 | `services/yuabaobot/proto-codec.js` | ~410 | 完成 | 基于 protobufjs，完整覆盖 ConnMsg/AuthBind/Ping/C2C/InboundMessage |
| Token 签名认证 | `services/yuabaobot/auth.js` | ~204 | 完成 | HMAC-SHA256 签名、token 缓存池、防并发重复请求 |
| WebSocket 客户端 | `services/yuabaobot/ws-client.js` | ~617 | 完成 | 连接/认证/心跳/重连/消息收发 全流程 |
| 监控服务(单例) | `services/yuabaobot/yuabaobot-monitor.js` | ~227 | 完成 | 渠道生命周期管理、入站握手绑定、appKey 复用连接 |
| 渠道适配器 | `services/channels/yuabaobot.channel.js` | ~164 | 完成 | 继承 BaseChannel，实现 send/validate/test/getConfigFields |
| API 控制器 | `controllers/yuabaobot.controller.js` | ~99 | 完成 | 绑定状态查询 / 重试绑定 |
| API 路由 | `routes/yuabaobot.routes.js` | ~15 | 完成 | GET status / POST retry |
| 渠道注册 | `services/channels/index.js` | 修改 | 完成 | 注册 yuanbaobot: yuabaobotChannel 映射 |
| 验证中间件白名单 | `middleware/validator.middleware.js:67` | 修改 | 完成 | .isIn() 加入 'yuanbaobot' |
| 创建渠道自动触发 WS | `services/channel.service.js:63-71` | 修改 | 完成 | createChannel 后立即 addChannel() |
| 应用启动入口 | `src/app.js:17,114` | 修改 | 完成 | 引入并启动 yuabaobotMonitor.start() |
| 路由挂载 | `src/routes/index.js:13,93` | 修改 | 完成 | 挂载 /api/yuabaobot 路由 |

### 当前问题（已修复待验证）

**问题**: 签名接口返回 `code=10097`
**根因**: 两处与官方实现不一致
1. **时间戳格式**: 原来带毫秒 (`...55.631+08:00`) -> 已修复为去掉毫秒 (`...55+08:00`)
2. **请求头缺失**: 原来只有 `Content-Type` -> 已补齐 `X-AppVersion`, `X-OperationSystem`, `X-Instance-Id`, `X-Bot-Version`

**修复位置**: `services/yuabaobot/auth.js`
- 第 37-40 行: `beijingISODate()` 增加 `.replace(/\.\d{3}/, '')`
- 第 138-143 行: POST headers 增加 4 个 X-* 身份标识头
- 新增第 9 行: `OPENCLAW_INSTANCE_ID = 16`
- 新增第 14-21 行: `getOS()` 工具函数

**验证方式**: 重启服务，观察日志中 `[yuanbaobot-auth] 签名响应 code=` 是否变为 0

---

## 二、架构设计（已落地）

### 2.1 文件结构（全部已创建）

```
server/src/
├── app.py                                    # [改] 启动时加载 yuabaobotMonitor
├── middleware/
│   └── validator.middleware.js               # [改] 白名单加入 yuanbaobot
├── routes/
│   ├── index.js                              # [改] 挂载 yuabaobot routes
│   └── yuabaobot.routes.js                     # [新] GET status / POST retry
├── controllers/
│   └── yuabaobot.controller.py                 # [新] 绑定状态/重试控制器
├── services/
│   ├── channel.service.py                    # [改] createChannel 自动触发 WS
│   ├── channels/
│   │   ├── index.js                          # [改] 注册 yuabaobotChannel
│   │   └── yuabaobot.channel.js                # [新] 渠道适配器
│   └── yuabaobot/
│       ├── proto-codec.js                    # [新] Protobuf 编解码
│       ├── auth.js                           # [新] Token 签名管理
│       ├── ws-client.js                      # [新] WS 客户端
│       └── yuabaobot-monitor.js               # [新] 监控单例
```

### 2.2 完整数据流

```
用户操作                        后端处理                       元宝服务器
---------                      ----------                   ------------
                                                                |
1 填写 appKey/appSecret                                       |
   POST /api/channels                                         |
      |                                                        |
      v                                                        |
2 channel.service.createChannel()                             |
   |- 写 DB (channel_type=yuanbaobot)                         |
   `- yuabaobotMonitor.addChannel(id)  --> 3                    |
           |                                                  |
           v                                                  |
4 ws-client._doConnect()                                      |
   |- auth.getToken() --> HTTP POST sign-token --> 5          |
   |   (HMAC-SHA256 签名)        <--- token/botId --|         |
   |                                                        |
   |- new WebSocket(wss://...) --> 6 建立 WS 连接            |
   |                              <--- connected               |
   |                                                        |
   |- 发送 AuthBind (Protobuf) --> 7                          |
   |                              <--- AuthBindRsp code=0     |
   |                                                        |
   `- state = 'connected'                                     |
      onReady 回调触发                                         |
                                                                |
8 前端轮询 GET /api/yuabaobot/bind/:id/status                     |
   返回 { connectionState:'connected', bound:false }            |
   -> 显示 [我已操作] 按钮                                        |
                                                                |
9 用户在元宝 App 给 Bot 发消息                                   |
                                                              |
   <--- inbound_message_push -- 10 元宝推送入站消息             |
      |                                                        |
      v                                                        |
11 monitor._handleInboundEvent()                                |
   |- 提取 fromAccount                                         |
   |- 写 DB config.toUserId = fromAccount                       |
   `- boundSet.add(channelId)                                  |
                                                                |
12 前端再次轮询 status                                           |
   返回 { connectionState:'connected', bound:true }             |
   -> 渠道就绪                                                   |
                                                                |
13 推送消息                                                       |
   channel.send(msg)                                            |
   `- client.sendText(toUserId, text)                           |
       `- sendC2CMessage (Protobuf) --> 14                      |
                                 <--- SendMessageRsp code=0    |
```

---

## 三、各模块详细说明（当前实现）

### 3.1 proto-codec.js -- Protobuf 编解码器

使用 `protobufjs` 库的 JSON descriptor 方式动态构建 Root（无需 .proto 文件）。

**已实现的编解码能力**:

| 功能 | 方法 | 状态 |
|------|------|------|
| ConnMsg 信封编码/解码 | `encodeConnMsg()` / `decodeConnMsg()` | OK |
| AuthBind 请求构建 | `buildAuthBindMsg(payload)` | OK |
| Ping 请求构建 | `buildPingMsg(msgId)` | OK |
| 业务请求信封 | `buildBusinessConnMsg(cmd, module, data, msgId)` | OK |
| C2C 消息编码 | `encodeSendC2CMessageReq(params)` | OK |
| 发送响应解码 | `decodeSendMessageRsp(data)` | OK |
| 入站消息解码 | `decodeInboundMessagePush(data)` | OK |
| Push ACK 构建 | `buildPushAck(headMsg)` | MVP 暂返回 null |
| 按 type name 解码 | `decodePB(typeName, data)` | OK |

**Proto Schema**: 完整提取自官方 `yuanbao-openclaw-plugin`,包含:
- **conn_common**: Head, ConnMsg, AuthBindReq/Rsp, PingReq/Rsp, KickoutMsg, PushMsg 等
- **yuanbao_openclaw_proxy**: SendC2CMessageReq/Rsp, InboundMessagePush, MsgBodyElement 等

### 3.2 auth.js -- Token 签名管理

```
类: TokenManager (按 appKey 缓存的实例池)
方法:
  - getToken()          -> 获取有效 token(缓存命中或重新签发)
  - invalidateCache()   -> 清除缓存强制刷新
私有:
  - _requestSignToken() -> 调用元宝 API 签发 token

全局函数:
  - getTokenManager(appKey, appSecret, apiDomain?) -> 获取/创建 TokenManager
  - computeSignature(nonce, ts, appKey, appSecret) -> HMAC-SHA256
  - generateNonce() -> 16字节随机 hex
  - beijingISODate() -> 北京时间 ISO 字符串(无毫秒)
  - getOS() -> 操作系统标识
```

**关键参数**:

| 参数 | 值 |
|------|-----|
| API 地址 | `https://bot.yuanbao.tencent.com/api/v5/robotLogic/sign-token` |
| 签名算法 | HMAC-SHA256(appSecret, nonce + timestamp + appKey + appSecret) |
| Token 过期策略 | 提前 5 分钟刷新 (`TOKEN_REFRESH_BEFORE_MS`) |
| 并发控制 | `_signingFlight` Promise 复用,避免同一时刻多发请求 |
| Instance ID | 16 (与官方一致) |

**请求头 (已修复)**:
```json
{
  "Content-Type": "application/json",
  "X-AppVersion": "magicpush-1.0.0",
  "X-OperationSystem": "Linux",
  "X-Instance-Id": "16",
  "X-Bot-Version": "magicpush-1.0.0"
}
```

**时间戳格式 (已修复)**:
```
正确: 2026-05-02T10:38:55+08:00
错误: 2026-05-02T10:38:55.631+08:00  (有毫秒)
```

### 3.3 ws-client.js -- WebSocket 客户端

```
类: yuabaobotWsClient

状态机: disconnected -> connecting -> authenticating -> connected
                                              `- reconnecting -> ...

公开方法:
  - connect()           -> 启动连接流程
  - disconnect()        -> 主动断开
  - getState()          -> 当前状态字符串
  - sendText(toAccount, text) -> 发送 C2C 文本消息

回调:
  - onReady(info)       -> 认证成功 (connectId, ip)
  - onError(err)        -> 错误
  - onDispatch(event)   -> 入站消息推送
  - onStateChange(state)-> 状态变化
  - onKickout(info)     -> 被踢下线
```

**心跳机制**:
- 首次延迟 5s,后续间隔由服务端 `heartInterval` 控制(默认 5s)
- 连续 2 次 ACK 未收到触发重连
- 超时阈值: `HEARTBEAT_TIMEOUT_THRESHOLD = 2`

**重连策略**:

```javascript
RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000, 60000];  // ms
MAX_RECONNECT_ATTEMPTS = 50;
```

**错误码分类**:

| 类型 | 错误码 | 处理方式 |
|------|--------|---------|
| 不再重连 | 4012, 4013, 4014, 4018, 4019, 4021 | 停止,标记 disconnected |
| 刷新 token 重试 | 41103, 41104, 41108 | invalidateCache -> 重连 |
| 瞬时可重试 | 50400, 50503 | 直接重连 |
| 其他 | - | 直接重连(默认行为) |

**请求-响应匹配**: 通过 `msgId` (UUID去横杠) 做 Map 匹配,30s 超时。

### 3.4 yuabaobot-monitor.js -- 监控服务(单例)

```
单例: yuabaobotMonitor

核心数据结构:
  - clientMap: Map<appKey, yuabaobotWsClient>  -> 同一 appKey 复用连接
  - boundSet: Set<channelId>                  -> 已完成握手的渠道 ID

公开方法:
  - start()             -> 扫描 DB 中所有激活 yuabaobot 渠道,建立连接
  - stop()              -> 断开所有连接
  - addChannel(channelId) -> 新增渠道时调用(含清除旧绑定)
  - removeChannel(channelId) -> 删除渠道时清理
  - isBound(channelId)  -> 是否已握手
  - getClient(appKey)   -> 获取 WS Client(供适配器发消息用)
```

**入站握手绑定逻辑**:
```
收到 inbound_message_push
  -> 提取 fromAccount (用户元宝 ID)
  -> 写 DB: config.toUserId = fromAccount
  -> 写 DB: config.senderNickname = senderNickname
  -> boundSet.add(channelId)
  -> 日志: 握手成功!
```

### 3.5 yuabaobot.channel.js -- 渠道适配器

```
类: yuabaobotChannel extends BaseChannel

配置字段:
  - appKey        (必填, text)
  - appSecret     (必填, password)
  - _docLinks     (帮助链接组)
  - _bindingHint  (绑定提示文字)

特殊字段 toUserId:
  - 用户填表时不显示(创建时为空)
  - 用户在元宝 App 给 Bot 发消息后,由 monitor 自动从 inbound push 提取写入
  - send() 时检查: 为空则抛错提示先完成绑定
```

**send 流程**:
1. 检查 toUserId -> 无则报错
2. HTML 标签清理 (type === 'html')
3. 从 monitor 获取 WS Client (by appKey)
4. 检查 client.state === 'connected'
5. 调用 client.sendText(toUserId, text)
6. 检查 result.code === 0

### 3.6 API 接口

#### yuabaobot.controller.js

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/yuabaobot/bind/:channelId/status` | 查询绑定状态和 WS 连接状态 |
| POST | `/api/yuabaobot/bind/:channelId/retry` | 重置绑定 + 触发重连 |

**status 响应格式**:
```json
{
  "success": true,
  "data": {
    "bound": false,
    "toUserId": null,
    "senderNickname": null,
    "connectionState": "connected"
  },
  "message": "等待握手绑定"
}
```

---

## 四、前端对接要点(待开发)

### 4.1 创建渠道后的交互流程

```
+----------------------------------------------------------+
|  用户填写 App Key + App Secret -> 点保存                  |
|      v                                                     |
|  后端: createChannel -> DB + 自动触发 WS 连接               |
|      v                                                     |
|  前端: 显示"正在连接元宝服务器..." (loading 状态)            |
|      v 轮询 GET /api/yuabaobot/bind/:id/status (每 3-5s)    |
|                                                          |
|  +- connectionState = 'connecting' ---> 继续等待           |
|  +- connectionState = 'connected' ---> 显示[我已操作]按钮   |
|  `- connectionState = 'disconnected' --> 显示错误 + 重试   |
|                                                          |
|  用户点[我已操作]:                                           |
|    -> 提示:"请打开元宝 App,给你的 Bot 发送一条任意消息"      |
|    -> 继续轮询 status                                        |
|      v                                                      |
|  bound = true -> 显示"绑定成功!可以接收通知了"                |
+----------------------------------------------------------+
```

### 4.2 关键前端状态判断

```javascript
// 轮询 status 接口
const res = await fetch(`/api/yuabaobot/bind/${channelId}/status`);
const { bound, connectionState } = res.data;

if (!bound && connectionState === 'connected') {
  // WS 已通但未握手 -> 显示「我已操作」按钮
}
if (bound && connectionState === 'connected') {
  // 完全就绪 -> 可以正常推送
}
if (connectionState === 'disconnected' || connectionState === 'reconnecting') {
  // 连接异常 -> 显示重试按钮
}
```

### 4.3 getConfigFields 中的特殊字段

`_docLinks` 和 `_bindingHint` 是非标准字段,前端需要识别并渲染:
- `type: 'links'` -> 渲染为帮助文档链接列表
- `type: 'hint'` -> 渲染为信息提示文本(不参与提交)
- `name` 以 `_` 开头的字段 -> 建议前端过滤掉不作为表单项提交给后端

---

## 五、已知限制 & TODO

### 当前 MVP 限制

| # | 限制 | 影响 | 计划 |
|---|------|------|------|
| 1 | 仅支持 C2C 文本消息 | 无法发图片/文件/群聊 | Phase 3 |
| 2 | Push ACK 未实现 | 服务端可能重推 | 低风险,MVP 可接受 |
| 3 | 单进程内存缓存 (managerPool/tokenCache) | 多实例部署不共享 | 生产环境需 Redis |
| 4 | 同一 appKey 只保留一个 WS 连接 | 多渠道同 appKey 共享连接 | 合理的设计 |
| 5 | 删除渠道未联动 monitor.removeChannel() | 可能残留空闲连接 | 需补充 channel.service.deleteChannel 中的调用 |
| 6 | 更新渠道未重连 WS | 改 appKey/appSecret 后需手动 retry | 需补充 updateChannel 中的联动 |
| 7 | 无前端 UI | 无法通过界面创建/管理元宝 Bot 渠道 | 待开发 |

### TODO 清单

- [ ] **[P0]** 验证 code=10097 修复是否生效(重启服务观察日志)
- [ ] **[P0]** 补充 `deleteChannel` 中调用 `monitor.removeChannel()`
- [ ] **[P0]** 补充 `updateChannel` 中检测 appKey/appSecret 变化并触发重连
- [ ] **[P1]** 开发前端 yuabaobotConfigDialog.vue(含轮询状态/绑定引导)
- [ ] **[P1]** 前端支持 `_docLinks`(links类型) 和 `_bindingHint`(hint类型) 字段渲染
- [ ] **[P2]** 实现 Push ACK (`buildPushAck`)
- [ ] **[P2]** 支持多媒体消息(图片/文件等)
- [ ] **[P2]** 支持群聊消息发送
- [ ] **[P3]** Token 缓存迁移到 Redis(多实例支持)

---

## 六、技术参考

### 6.1 对比官方源码的关键差异点

| 差异项 | 官方 (TypeScript) | 我们 (JavaScript) | 备注 |
|--------|------------------|------------------|------|
| Protobuf 编译 | .proto 文件动态编译 | JSON descriptor | 效果一致,无需 proto 文件 |
| WS 库 | ws (相同) | ws (相同) | 一致 |
| 签名算法 | 相同 HMAC-SHA256 | 相同 | 已对齐 |
| 时间戳 | `.replace(/\.\d{3}/,"")` | 同上 | 已修复 |
| 请求头 | X-AppVersion 等 4 个头 | 同上 | 已修复 |
| Instance Id | 16 | 16 | 一致 |
| 心跳间隔 | 可配置 | 默认 5s,可被服务端更新 | 一致 |
| 重连策略 | 类似指数退避 | 固定档位退避 | 我们的更简单可控 |

### 6.2 官方资源
- GitHub: https://github.com/Tencent/yuanbao-openclaw-plugin
- 关键参考文件: `client.ts`, `gateway.ts`, `request.ts`, `auth.ts`

### 6.3 项目内部参考
- 龙虾机器人: `server/src/services/clawbot/` (HTTP 长轮询模式)
- 渠道基类: `server/src/services/channels/base.channel.js`
- 推送服务: `server/src/services/push.service.js`

---

> **下一步操作**: 重启服务,观察日志中 `code=` 是否变为 0。如果签名成功,WS 应该能正常建立连接并认证。
