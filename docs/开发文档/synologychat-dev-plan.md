# 群晖 Chat (Synology Chat) 通知渠道开发计划

## 一、渠道概述

| 项目 | 内容 |
|------|------|
| **渠道名称** | `synologychat` |
| **中文名称** | 群晖 Chat |
| **官方名称** | Synology Chat Incoming Webhook |
| **官网** | https://www.synology.com/en-global/dsm/feature/chat |
| **文档** | https://kb.synology.com/en-global/DSM/tutorial/How_to_use_Synology_Chat_to_send_notifications |
| **类型** | 自托管 Webhook 推送 |

## 二、API 规范

### 2.1 接口地址

```
POST {serverUrl}/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token={token}
```

- **默认 serverUrl**: 用户自填（群晖 DSM 地址，如 `https://nas.example.com:5001`）
- **token**: 在 Chat 应用中创建 Incoming Webhook 时生成

### 2.2 请求格式

| 项目 | 值 |
|------|-----|
| **Method** | `POST` |
| **Content-Type** | `application/x-www-form-urlencoded` |
| **Body** | `payload={"text":"消息内容"}` |

> 注意：payload 是一个 JSON 字符串，作为 form 字段的值发送。

### 2.3 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | 是 | 消息文本内容 |
| `file_url` | string | 否 | 附件 URL（可选） |

### 2.4 URL Query 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `api` | string | 是 | 固定值 `SYNO.Chat.External` |
| `method` | string | 是 | 固定值 `incoming` |
| `version` | string | 是 | 固定值 `2` |
| `token` | string | 是 | Incoming Webhook Token |

### 2.5 响应格式

**成功响应**：
```json
{
  "success": true
}
```

**失败响应**：
```json
{
  "error": {
    "code": 117,
    "message": "..."
  }
}
```

### 2.6 调用示例

```bash
curl -X POST "https://nas.example.com:5001/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=%22mytoken%22" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'payload={"text":"服务器告警：CPU达到90%"}'
```

> **注意**：token 在 URL 中需要 URL 编码且带引号包裹（如 `%22mytoken%22`）

## 三、配置字段设计

| 序号 | 字段名 | 字段 key | 类型 | 必填 | 默认值 | 说明 |
|------|--------|----------|------|------|--------|------|
| 1 | 服务地址 | `serverUrl` | text | 否 | — | 群晖 DSM 地址，如 `https://nas.example.com:5001` |
| 2 | Token | `token` | password/text | **是** | — | Incoming Webhook Token |

**前端表单示例**：
```json
[
  {
    "key": "serverUrl",
    "label": "服务地址",
    "type": "text",
    "placeholder": "https://nas.example.com:5001",
    "required": false,
    "description": "群晖 DSM 的访问地址"
  },
  {
    "key": "token",
    "label": "Token",
    "type": "password",
    "placeholder": "Incoming Webhook Token",
    "required": true,
    "description": "在 Synology Chat 中创建 Incoming Webhook 时生成的 Token"
  }
]
```

## 四、技术要点

### 4.1 特殊处理

1. **Token URL 编码**: token 在 URL query 中需编码并带引号
   - 原 token: `mytoken`
   - 编码后: `%22mytoken%22`
   
2. **Form URL 编码**: payload 作为 form body 发送（非 JSON body）

3. **消息拼接策略**: 将 title + content 拼接为一条消息
   - 格式: `{title}\n\n{content}`
   - 与 PushDeer、Server酱等渠道一致

4. **错误处理**:
   - HTTP 非 200 → 判定为失败
   - response body 包含 error.code → 判定为失败
   - 网络超时 → 抛出超时异常

### 4.2 与其他渠道对比

| 对比项 | 群晖 Chat | PushDeer | iGot |
|--------|-----------|----------|------|
| 请求方式 | POST form | POST form | POST JSON |
| Body 格式 | payload JSON in form | key/title/content fields | title + content JSON |
| Token 位置 | URL query (带引号编码) | URL path | URL path |
| 自托管 | 是 (群晖 NAS) | 可选 | 可选 |
| 复杂度 | 中等 | 低 | 低 |

## 五、开发步骤

### 步骤 1: 新增渠道适配器文件

创建 `server/src/services/channels/synologychat.channel.js`：

```javascript
// 核心逻辑骨架
class SynologyChatChannel {
  static get channelType() { return 'synologychat'; }
  // ...
}
module.exports = SynologyChatChannel;
```

**预计代码量**: ~100 行（与 PushDeer/iGot 类似规模）

### 步骤 2: 注册到渠道管理器

修改 `server/src/services/channels/index.js`:
- 引入模块
- 加入 channelAdapters 映射
- 导出类

### 步骤 3: 校验中间件白名单

修改 `server/src/middleware/validator.middleware.js`:
- isIn 白名单添加 `'synologychat'`

### 步骤 4: 前端 - List.vue

修改 `web/src/views/channels/List.vue`:
- 渠道说明文案追加「群晖 Chat」
- 颜色映射 (建议 `bg-yellow-600`)
- 图标映射 (建议 `MonitorSpeakerphone` 或 `MessageSquare`)
- 文档链接 (官网 + KB 文档)

### 步骤 5: 前端 - About.vue

修改 `web/src/views/About.vue`:
- 渠道卡片列表追加
- 功能描述文案追加

### 步骤 6: 更新 README.md

两处更新:
- 消息渠道支持列表
- 频率限制表

## 六、涉及文件清单

| 操作 | 文件路径 |
|------|----------|
| **新增** | `server/src/services/channels/synologychat.channel.js` |
| **修改** | `server/src/services/channels/index.js` |
| **修改** | `server/src/middleware/validator.middleware.js` |
| **修改** | `web/src/views/channels/List.vue` |
| **修改** | `web/src/views/About.vue` |
| **修改** | `README.md` |

## 七、UI 设计决策

| 项目 | 决定 |
|------|------|
| **颜色** | `bg-yellow-600` / `bg-yellow-100` (黄色系，呼应 Synology 品牌) |
| **图标** | `MonitorSpeakerphone` (lucide-vue-next) — 代表聊天/通讯应用 |
| **排序** | 排在 iGot 之后（按新增时间顺序） |

## 八、频率限制信息

| 项目 | 内容 |
|------|------|
| **限制情况** | 取决于群晖硬件性能和 DSM 配置 |
| **粒度** | 无明确 API 限流（自托管服务） |
| **备注** | 受 NAS 硬件性能、网络带宽影响；高频推送可能造成资源压力 |
