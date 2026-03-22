# ClawBot / OpenClaw 集成可行性评估报告

> 评估日期：2026-03-22
> 项目：MagicPush（魔法推送）v1.3.0

---

## 一、ClawBot / OpenClaw 是什么

**ClawBot** 是微信官方推出的 AI Agent 接入通道（目前处于 research preview 阶段），通过微信内的 ClawBot 插件（目前仅支持 iOS 最新版微信 8.0.7+）允许外部 Agent 与微信用户双向通信。

**官方 SDK 包**：`@tencent-weixin/openclaw-weixin`

**相关开源项目**：
- [nexu](https://github.com/nexu-io/nexu) — OpenClaw 桌面客户端，支持 WeChat / Feishu / Slack / Discord
- [comfyui-openclaw](https://github.com/RookieStar28/comfyui-openclaw) — ComfyUI 的 OpenClaw 集成，支持 7 大 IM 平台
- [claude-code-wechat-channel](https://github.com/johnixr/claude-code-wechat-channel) — Claude Code 的 WeChat 通道插件

---

## 二、ilink API 技术细节

### 2.1 基础信息

| 项目 | 值 |
|---|---|
| API 基础地址 | `https://ilinkai.weixin.qq.com` |
| 认证方式 | 扫码登录 → Bearer Token |
| 认证头 | `Authorization: Bearer <token>` + `AuthorizationType: ilink_bot_token` |
| 请求格式 | JSON POST |
| Bot 类型 | `bot_type=3` |

### 2.2 API 端点

| 端点 | 方法 | 用途 |
|---|---|---|
| `ilink/bot/get_bot_qrcode` | GET | 获取登录二维码 |
| `ilink/bot/get_qrcode_status` | GET | 轮询扫码状态（wait → scaned → confirmed / expired） |
| `ilink/bot/getupdates` | POST | 长轮询接收消息（超时 ~35s） |
| `ilink/bot/sendmessage` | POST | 发送消息给用户 |

### 2.3 认证流程

```
1. 请求 ilink/bot/get_bot_qrcode → 获取二维码
2. 用户微信扫码 → 轮询 ilink/bot/get_qrcode_status
3. 状态变为 confirmed → 返回 bot_token、ilink_bot_id、baseurl、ilink_user_id
4. 保存凭据，后续使用 Bearer Token 调用 API
```

### 2.4 发送消息格式

```json
{
  "msg": {
    "from_user_id": "",
    "to_user_id": "xxx@im.wechat",
    "client_id": "unique-client-id",
    "message_type": 2,
    "message_state": 2,
    "item_list": [
      {
        "type": 1,
        "text_item": {
          "text": "消息内容"
        }
      }
    ],
    "context_token": "对话上下文token"
  },
  "base_info": {
    "channel_version": "0.1.0"
  }
}
```

**关键字段说明**：

| 字段 | 说明 |
|---|---|
| `to_user_id` | 目标用户 ID，格式为 `xxx@im.wechat` |
| `client_id` | 客户端唯一标识，需自行生成 |
| `message_type` | `1` = 用户消息，`2` = Bot 消息 |
| `message_state` | `2` = 消息完成状态 |
| `item_list[].type` | `1` = 文本，`3` = 语音 |
| `context_token` | 对话上下文标识，需从接收到的消息中获取 |

### 2.5 消息类型常量

```javascript
// 消息类型
const MSG_TYPE_USER = 1;   // 用户发送的消息
const MSG_TYPE_BOT = 2;    // Bot 发送的消息

// 消息状态
const MSG_STATE_FINISH = 2; // 消息完成

// 内容类型
const MSG_ITEM_TEXT = 1;    // 文本
const MSG_ITEM_VOICE = 3;   // 语音
```

---

## 三、MagicPush 架构适配性分析

### 3.1 现有渠道架构

MagicPush 采用**适配器模式**，新增渠道需：

1. 继承 `BaseChannel`（`server/src/services/channels/base.channel.js`），实现：
   - `send(message)` — 发送消息（message = `{title, content, type}`）
   - `validate(config)` — 验证渠道配置
   - `test()` — 发送测试消息
   - `static getName()` — 渠道显示名称
   - `static getDescription()` — 渠道描述
   - `static getConfigFields()` — 配置字段定义（前端自动渲染表单）

2. 在 `channels/index.js` 的 `channelAdapters` 中注册

3. 在 `middleware/validator.middleware.js` 的类型白名单中添加

### 3.2 ClawBot 适配器设计（概念）

```
ClawbotChannel extends BaseChannel
  config: {
    token:       string  // Bearer Token（扫码登录获取）
    toUserIds:   string  // 推送目标用户 ID（逗号分隔）
    baseUrl:     string  // API 地址（默认 https://ilinkai.weixin.qq.com）
  }
  send({title, content, type})
    → POST ilink/bot/sendmessage
    → 返回结果
```

### 3.3 适配可行性

| 维度 | 评估 |
|---|---|
| 代码结构兼容性 | 完全兼容，适配器模式天然支持新渠道 |
| 前端改动 | 无需改动，`getConfigFields()` 自动渲染配置表单 |
| 开发工作量 | 约 150-200 行代码，参考现有适配器 |

---

## 四、关键限制与风险

| 维度 | 风险等级 | 详细说明 |
|---|---|---|
| **认证方式** | **高** | 扫码登录获取 Bearer Token，Token 可能过期需重新扫码。无人值守服务器场景下极不友好，无法自动续期 |
| **单实例限制** | **高** | 每个 ClawBot 只能连接一个 Agent 实例。同一个微信账号不能同时给其他 ClawBot 应用使用 |
| **API 稳定性** | **高** | 处于 Research Preview 阶段，API 随时可能变更或下线 |
| **平台限制** | **中** | 目前仅支持 iOS 最新版微信，Android / PC / Mac 均不支持 |
| **目标用户发现** | **中** | 需要用户先发消息过来才能获取 `from_user_id`（格式 `xxx@im.wechat`）。作为推送服务，很难提前知道目标用户的 ID |
| **context_token 依赖** | **低** | 发送消息需要维护对话的 `context_token`，首次推送前需用户先与 Bot 发生一次对话 |
| **协议特殊性** | **低** | ilink API 需要特殊请求头（`AuthorizationType`、`X-WECHAT-UIN`），但实现难度不大 |

---

## 五、与现有微信渠道对比

| 渠道 | 认证方式 | 稳定性 | 使用门槛 | 用户覆盖 | 依赖第三方 |
|---|---|---|---|---|---|
| `wechat_official`（微信公众号） | AppID/AppSecret（永久） | 高 | 需申请公众号 + 模板审核 | 高（所有微信用户） | 否 |
| `pushplus` | Token（永久） | 高 | 关注微信公众号即可 | 高 | 是 |
| `wxpusher` | appToken + uids（永久） | 高 | 关注 WxPusher 公众号 | 高 | 是 |
| `serverchan`（Server酱） | sendKey（永久） | 中高 | 关注 Server酱公众号 | 中 | 是 |
| **clawbot**（潜在新增） | **扫码登录 Token（可能过期）** | **低** | **需 iOS 最新版微信 + 安装插件** | **极低** | 否 |

---

## 六、结论

### 技术上：**可行**

MagicPush 的适配器架构可以轻松接入 ClawBot，开发工作量约 150-200 行代码，无需修改前端。

### 实际价值：**有限，不建议现阶段集成**

核心原因：

1. **扫码认证不适合服务器端推送** — MagicPush 定位是"一次 API 调用 → 推送到多渠道"的托管服务，ClawBot 的扫码登录和可能过期的 Token 与"无人值守、稳定运行"的核心需求冲突。

2. **单实例限制是致命伤** — 同一个微信号只能绑一个 ClawBot，意味着如果同时想用 ClawBot 接入 Claude Code 等其他 AI Agent，就不能再用它做推送。

3. **预览阶段风险大** — API 随时可能变更，投入开发成本后可能白费。

4. **现有方案更成熟** — PushPlus / WxPusher / Server酱均基于永久 API Key，更适合 MagicPush 的使用场景。

### 未来展望

**如果微信正式发布 ClawBot 并提供以下能力**，届时集成将非常有价值：

- API Key 认证方式（替代扫码登录）
- 支持更多平台（Android / PC / Mac）
- 支持多实例 / 多 Agent
- 稳定的 Token 续期机制

到那时，ClawBot 将是最"原生"的微信个人消息推送通道，无需依赖第三方中转服务，且 MagicPush 的适配器架构可以很轻松地接入。

---

## 七、参考资料

- [nexu - OpenClaw 桌面客户端](https://github.com/nexu-io/nexu)
- [comfyui-openclaw - ComfyUI OpenClaw 集成](https://github.com/RookieStar28/comfyui-openclaw)
- [claude-code-wechat-channel - Claude Code WeChat 通道](https://github.com/johnixr/claude-code-wechat-channel)
- MagicPush 项目 `docs/new-channel-dev-guide.md` — 新渠道开发指南
