# 企业微信应用消息渠道 (wecomapp) - 开发计划

> 状态：**待实现**
> 创建日期：2026-03-30

## 一、概述

企业微信应用消息推送（区别于现有的 `wecom` 群机器人 Webhook 渠道），通过企业微信自建应用向指定成员/部门/标签推送消息。适用于需要推送到个人而非群聊的场景。

**与 `wecom` 渠道的区别**：

| 对比项 | `wecom`（群机器人） | `wecomapp`（应用消息） |
|--------|-------------------|---------------------|
| 推送目标 | 群聊 | 个人/部门/标签/全员 |
| 鉴权方式 | Webhook Key（静态） | access_token（需刷新，7200秒有效期） |
| 配置复杂度 | 仅需 Key | 需要 corpid + corpsecret + agentid |
| 消息类型 | text、markdown | text、markdown、textcard、news 等 |
| 适用场景 | 群内通知 | 个人通知、告警推送 |

**核心特点**：
- 支持文本、Markdown、文本卡片等多种消息类型
- 可按成员、部门、标签精确推送
- 支持 `@all` 全员广播
- Markdown 支持标题、加粗、链接、行内代码、引用、字体颜色
- access_token 有效期 7200 秒，需缓存刷新

## 二、企业微信应用消息 API 信息

### 获取 access_token

```
GET https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=CORPID&corpsecret=CORPSECRET
```

**参数**：

| 参数 | 必须 | 说明 |
|------|------|------|
| corpid | 是 | 企业 ID |
| corpsecret | 是 | 应用的凭证密钥（每个应用独立） |

**响应**：

```json
{
  "errcode": 0,
  "errmsg": "ok",
  "access_token": "accesstoken000001",
  "expires_in": 7200
}
```

**注意事项**：
- access_token 有效期 7200 秒（2小时）
- 企业微信可能提前使 access_token 失效
- 不能频繁调用 gettoken 接口，需缓存
- 每个应用的 access_token 独立，需区分应用存储

### 发送应用消息

```
POST https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=ACCESS_TOKEN
Content-Type: application/json
```

#### 文本消息

```json
{
  "touser": "UserID1|UserID2",
  "toparty": "PartyID1",
  "totag": "TagID1",
  "msgtype": "text",
  "agentid": 1,
  "text": {
    "content": "消息内容，最长不超过2048字节"
  }
}
```

#### Markdown 消息

```json
{
  "touser": "UserID1",
  "msgtype": "markdown",
  "agentid": 1,
  "markdown": {
    "content": "您的会议室已经预定，稍后会同步到`邮箱`\n> **事项详情**\n> 会议室：<font color=\"info\">广州TIT 1楼 301</font>"
  }
}
```

> Markdown 支持的语法子集：
> - 标题（# ~ ######）
> - 加粗（**bold**）
> - 链接（[text](url)）
> - 行内代码（`code`）
> - 引用（> text）
> - 字体颜色：`<font color="info">绿色</font>`、`<font color="comment">灰色</font>`、`<font color="warning">橙红色</font>`

**公共参数**：

| 参数 | 必须 | 说明 |
|------|------|------|
| touser | 否 | 成员 ID 列表（`|` 分隔，最多 1000 个）；`@all` = 全员 |
| toparty | 否 | 部门 ID 列表（`|` 分隔，最多 100 个） |
| totag | 否 | 标签 ID 列表（`|` 分隔，最多 100 个） |
| msgtype | 是 | 消息类型：`text`、`markdown`、`textcard` 等 |
| agentid | 是 | 企业应用 ID（整型） |

> touser、toparty、totag 不能同时为空。

**响应**：

```json
{
  "errcode": 0,
  "errmsg": "ok",
  "invaliduser": "userid1|userid2",
  "invalidparty": "partyid1",
  "invalidtag": "tagid1",
  "msgid": "xxxx"
}
```

**频率限制**：
- 每应用不可超过 账号上限数 × 200 人次/天
- 每应用对同一成员不可超过 30 次/分钟、1000 次/小时

### 用户配置流程

1. 登录企业微信管理后台（work.weixin.qq.com）
2. 在「我的企业」页面获取 **企业 ID**（corpid）
3. 在「应用管理」中创建或选择一个自建应用
4. 获取应用的 **AgentId**
5. 在应用详情页获取 **Secret**（corpsecret）
6. 确保应用可见范围内包含目标成员

## 三、实现方案

### 设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| access_token 管理 | 内存缓存 + 过期自动刷新 | 7200 秒有效期，内存缓存够用，重启自动重新获取 |
| 消息格式 | 优先 Markdown，降级纯文本 | 企业微信原生支持 Markdown 渲染 |
| 推送目标 | 支持成员 ID / @all | 覆盖最常用场景，避免配置过于复杂 |
| 不支持 toparty/totag | 仅配置 touser | 简化用户配置，部门/标签推送属于高级场景 |
| 无新增依赖 | 直接用 axios | 与现有架构一致 |

### 配置字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `corpid` | text | 是 | 企业 ID（corpid） |
| `corpsecret` | password | 是 | 应用的凭证密钥（Secret） |
| `agentid` | number | 是 | 应用 AgentId（整型） |
| `touser` | text | 是 | 接收消息的成员 ID（多个用 \| 分隔），填 `@all` 推送全员 |

### 消息类型处理

| 输入 type | 企业微信处理方式 |
|-----------|----------------|
| `text` | 发送 `text` 类型消息 |
| `markdown` | 发送 `markdown` 类型消息（原生渲染） |
| `html` | 剥离 HTML 标签转为纯文本后发送 |

### access_token 缓存策略

```javascript
// 内存缓存
this._tokenCache = {
  token: null,
  expiresAt: 0  // 过期时间戳（毫秒）
};

async _getAccessToken() {
  const now = Date.now();
  // 提前 5 分钟刷新，避免边界情况
  if (this._tokenCache.token && now < this._tokenCache.expiresAt - 300000) {
    return this._tokenCache.token;
  }
  // 请求新 token
  const { data } = await axios.get(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken`,
    { params: { corpid: this.corpid, corpsecret: this.corpsecret } }
  );
  if (data.errcode !== 0) {
    throw new Error(`获取access_token失败: ${data.errmsg}`);
  }
  this._tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000
  };
  return data.access_token;
}
```

## 四、涉及文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `server/src/services/channels/wecomapp.channel.js` | 渠道适配器（含 access_token 管理） |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `server/src/services/channels/index.js` | 注册 wecomapp 渠道（import + 映射 + 导出，+3 行） |
| `server/src/middleware/validator.middleware.js` | 白名单添加 `wecomapp`（+1 处） |
| `web/src/views/channels/List.vue` | 添加颜色、图标、import、描述文本（+4 处） |
| `web/src/views/Login.vue` | 页脚渠道列表添加企业微信应用（+1 处） |
| `web/src/views/About.vue` | 图标列表、功能描述更新、import（+3 处） |

## 五、详细设计

### 渠道适配器 `wecomapp.channel.js`

```javascript
class WecomappChannel extends BaseChannel {
  constructor(config, channelId) {
    super(config);
    this.corpid = config.corpid;
    this.corpsecret = config.corpsecret;
    this.agentid = parseInt(config.agentid);
    this.touser = config.touser;
    this.channelId = channelId;
    this._tokenCache = { token: null, expiresAt: 0 };
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    const accessToken = await this._getAccessToken();

    const body = {
      touser: this.touser,
      agentid: this.agentid,
    };

    if (type === 'markdown') {
      body.msgtype = 'markdown';
      body.markdown = { content: content };
    } else {
      body.msgtype = 'text';
      let text = type === 'html' ? this._stripHtml(content) : content;
      body.text = { content: text };
    }

    const response = await axios.post(
      `https://qyapi.weixin.qq.com/cgi-bin/message/send`,
      body,
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    if (response.data.errcode !== 0) {
      throw new Error(`企业微信应用消息发送失败: ${response.data.errmsg}`);
    }
    return response.data;
  }

  async _getAccessToken() { /* 缓存 + 刷新逻辑 */ }
  _stripHtml(html) { /* HTML 转纯文本 */ }
  validate(config) { /* 校验 corpid、corpsecret、agentid、touser */ }
  async test() { /* 发送测试消息 */ }
  static getName() { return '企业微信应用'; }
  static getDescription() { return '企业微信自建应用消息推送'; }
  static getConfigFields() { /* corpid, corpsecret, agentid, touser */ }
}
```

### 前端 UI

| 属性 | 值 |
|------|-----|
| 渠道名称 | 企业微信应用 |
| 渠道描述 | 企业微信自建应用消息推送 |
| 颜色 | `bg-green-700`（深绿色，与 `wecom` 的 `bg-green-500` 区分） |
| 图标 | `Building2`（企业/建筑图标，与 `wecom` 的 `MessageCircle` 区分） |

### getConfigFields()

```javascript
static getConfigFields() {
  return [
    {
      name: 'corpid',
      label: '企业 ID',
      type: 'text',
      required: true,
      placeholder: '在企业微信管理后台「我的企业」页面获取',
      description: '企业微信企业唯一标识（corpid）',
    },
    {
      name: 'corpsecret',
      label: '应用 Secret',
      type: 'password',
      required: true,
      placeholder: '在应用详情页获取',
      description: '自建应用的凭证密钥，每个应用独立',
    },
    {
      name: 'agentid',
      label: '应用 AgentId',
      type: 'number',
      required: true,
      placeholder: '在应用详情页获取',
      description: '企业应用 ID（整型）',
    },
    {
      name: 'touser',
      label: '接收成员',
      type: 'text',
      required: true,
      placeholder: '成员ID（多个用 | 分隔）或 @all',
      description: '消息接收者成员 ID，多个用 | 分隔；填 @all 推送应用可见范围内的全部成员',
    },
  ];
}
```

## 六、实现复杂度评估

比 Gotify/Meow 复杂，主要在于 access_token 管理：
- **1 个鉴权接口**（`GET /gettoken`）
- **1 个发送接口**（`POST /message/send`）
- **需要 access_token 缓存刷新**（7200 秒有效期，需提前刷新）
- **配置项较多**（corpid + corpsecret + agentid + touser）
- **无需单独 client 文件**（token 逻辑内嵌在 channel 中即可）
- **预计代码量**：~200 行（含 token 管理、HTML 转换、验证）

## 七、测试计划

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| 渠道注册 | `GET /api/channels/types` 包含 `wecomapp` | 列表中出现"企业微信应用" |
| 创建渠道 | 填写 corpid、secret、agentid、touser 并保存 | 渠道创建成功 |
| access_token | 发送消息时自动获取 token | token 获取并缓存成功 |
| 文本推送 | 推送纯文本消息 | 企业微信客户端收到通知 |
| Markdown 推送 | 推送 Markdown 消息 | 正确渲染 Markdown 格式 |
| HTML 推送 | 推送 HTML 消息 | 转为纯文本显示 |
| @all | touser 填 @all | 全员收到消息 |
| 测试按钮 | 点击测试 | 发送成功 |
| 无效凭据 | 使用错误的 corpid/secret | 返回明确错误 |
| token 刷新 | 等待 token 过期后再次发送 | 自动刷新 token 后发送成功 |

## 八、注意事项

1. **access_token 频率限制**：不要频繁调用 gettoken 接口
2. **消息频率限制**：每应用对同一成员不超过 30 次/分钟
3. **微工作台限制**：在微信端仅接收文本消息，且长度限制 20 字节
4. **可见范围**：接收成员必须在应用的可见范围内，否则返回 `invaliduser`
5. **Markdown 限制**：仅支持子集语法，不支持列表、图片、表格等
6. **与 wecom 渠道共存**：两个渠道名称需明确区分（"企业微信" vs "企业微信应用"）

## 九、参考资源

- 企业微信开发者中心: https://developer.work.weixin.qq.com/
- 获取 access_token: https://developer.work.weixin.qq.com/document/path/91039
- 发送应用消息: https://developer.work.weixin.qq.com/document/path/90236
- 企业微信管理后台: https://work.weixin.qq.com/
