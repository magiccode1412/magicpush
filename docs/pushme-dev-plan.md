# PushMe 通知渠道 - 开发计划

> 状态：**已实现**
> 创建日期：2026-04-11

## 一、概述

[PushMe](https://push.i-i.me) 是一个简单轻量的 Android 消息通知客户端，支持插件和自部署服务端。用户可以在自己的服务器上部署 PushMe Server，通过 API 推送消息到 Android 客户端实时接收通知。

**核心特点**：
- 轻量级 Android 消息推送客户端（Android 7+）
- REST API 简洁（仅需一个推送接口）
- 支持 Markdown 消息格式
- 支持自部署服务端（Node.js >= 18，Docker 一键部署）
- 支持多 push_key 批量推送（逗号分隔，最多100个）
- 无第三方依赖，与现有架构一致

## 二、PushMe API 信息

### 发送消息 API

```
POST {serverUrl}
Content-Type: application/json
```

**请求方式**：支持 POST 和 GET（POST 推荐）

**鉴权方式**：
- 通过 `push_key` 参数进行身份验证
- push_key 在 PushMe APP 中生成或在服务端 Web 管理界面配置

**请求体/查询参数**：

```json
{
  "push_key": "xxxxxxxx",      // string, 必填, 推送密钥
  "title": "消息标题",          // string, 可选, 消息标题
  "content": "消息内容",       // string, 可选, 消息内容，支持 Markdown
  "type": "markdown",          // string, 可选, 消息类型（支持 markdown），默认 text
  "date": "2024-01-01"         // string, 可选, 日期时间
}
```

**注意**：title 和 content 至少填写一项。

**响应体**：

**标准响应**：
```
success
```

**错误响应示例**：
```
Push failed, empty push_key!
Push failed, empty title and content!
非法push_key!
Push failed, push_key numbers must be less than 100!
Push failed, the parameter format is incorrect!
```

**兼容第三方响应格式**（用于企微、钉钉、飞书等）：
```json
{
  "errcode": 0,
  "errmsg": "success",
  "code": 0,
  "msg": "success"
}
```

### 用户配置流程

1. 安装 PushMe Android 客户端（从 [Github](https://github.com/yafoo/pushme/releases/latest) 或 [Gitee](https://gitee.com/yafu/pushme/releases/latest) 下载）
2. 打开 APP，获取 push_key（复制保存）
3. （可选）自部署 PushMe Server：
   - Docker 部署：`docker run -dit -p 3010:3010 -p 3100:3100 -e TZ=Asia/Shanghai -v $PWD/pushme-server/config:/pushme-server/config --name pushme-server --restart unless-stopped yafoo/pushme-server:latest`
   - 源码安装：`npm i && node ./server.js`
4. 使用服务器地址 + push_key 即可推送消息

### 服务端端口说明

| 端口 | 用途 |
|------|------|
| 3100 | 消息服务端口（需开放给客户端连接） |
| 3010 | Web 管理、消息发送 API 端口 |

## 三、实现方案

### 设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| 推送方式 | 直接调用 `POST {serverUrl}` | PushMe 仅此一个推送接口 |
| 鉴权方式 | `push_key` 参数 | 与官方 API 保持一致 |
| 消息格式 | 优先 Markdown，降级纯文本 | PushMe 原生支持 Markdown 渲染 |
| Content-Type | `application/json` | JSON 格式传递参数 |
| SSL 验证 | 可选禁用 | 自部署环境可能使用自签名证书 |
| 无新增依赖 | 直接用 axios | 与现有架构一致 |

### 配置字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `serverUrl` | text | 否 | PushMe 服务端地址，如 `https://push.i-i.me` 或自建地址，留空默认官方（temp_key 模式仅支持官方） |
| `pushKey` | password | 否* | 推送密钥，在 PushMe APP 中获取或在服务端管理界面配置。与 tempKey 二选一 |
| `tempKey` | text | 否* | 临时测试密钥，仅支持官方服务，方便快速测试。与 pushKey 二选一 |

> *注：pushKey 和 tempKey 至少填写一项

### 消息类型处理

| 输入 type | PushMe 处理方式 |
|-----------|------------------|
| `text` | 直接作为 `content` 发送 |
| `markdown` | 设置 `type=markdown` 发送，PushMe 客户端渲染 Markdown |
| `html` | 剥离 HTML 标签转为纯文本后发送 |

## 四、涉及文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `server/src/services/channels/pushme.channel.js` | 渠道适配器（逻辑简单，无需单独 client 文件） |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `server/src/services/channels/index.js` | 注册 pushme 渠道（+2 行） |
| `server/src/middleware/validator.middleware.js` | 白名单添加 `pushme`（+1 处） |
| `web/src/views/channels/List.vue` | 添加颜色、图标、描述文本（+3 处） |

## 五、详细设计

### 渠道适配器 `pushme.channel.js`

```javascript
class PushMeChannel extends BaseChannel {
  constructor(config, channelId) {
    super(config);
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.pushKey = config.pushKey;
    this.channelId = channelId;
  }

  async send(message) {
    const { title, content, type = 'text' } = message;
    let text = content;

    // HTML 转纯文本
    if (type === 'html') {
      text = this._stripHtml(text);
    }

    const body = {
      push_key: this.pushKey,
      title: title || undefined,
      content: text || undefined,
    };

    // markdown 类型添加 type 字段
    if (type === 'markdown') {
      body.type = 'markdown';
    }

    const response = await axios.post(
      this.serverUrl,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    // 检查响应是否为 success
    const result = response.data;
    if (result === 'success' || (typeof result === 'object' && result.errcode === 0)) {
      return result;
    }
    throw new Error(`PushMe 推送失败: ${result}`);
  }

  // validate, test, getName, getDescription, getConfigFields ...
}
```

### 前端 UI

| 属性 | 值 |
|------|-----|
| 渠道名称 | PushMe |
| 渠道描述 | 轻量级 Android 消息推送服务 |
| 颜色 | `bg-emerald-500`（翠绿色，清新活力） |
| 图标 | `PhoneAndroid`（手机图标，强调 Android 客户端） |

### getConfigFields()

```javascript
static getConfigFields() {
  return [
    {
      name: 'serverUrl',
      label: '服务器地址',
      type: 'text',
      required: true,
      placeholder: '如 https://push.i-i.me 或 http://your-server.com:3010',
      description: 'PushMe 服务端地址，官方地址或自建服务地址',
    },
    {
      name: 'pushKey',
      label: 'Push Key',
      type: 'password',
      required: true,
      placeholder: '在 PushMe APP 中获取的 push_key',
      description: '推送密钥，用于身份验证',
    },
  ];
}
```

### test() 方法实现说明

测试方法应发送一条测试消息：

```javascript
async test() {
  await this.send({
    title: '测试消息',
    content: '这是一条来自系统的测试消息，如果您收到此消息，说明配置正确！',
    type: 'text',
  });
}
```

## 六、实现复杂度评估

PushMe 是目前最简单的通知渠道之一：

- **仅 1 个 API 接口**（POST 到 serverUrl）
- **无 Token 刷新机制**（push_key 是静态的，在 APP 或管理界面生成）
- **无会话/频道概念**（不像 QQ Bot 需要创建会话）
- **无需单独 client 文件**（直接在 channel 中调用 axios）
- **参数简单**：仅需 push_key + title + content + (可选 type)
- **预计代码量**：~110 行（含注释和辅助方法）

## 七、测试计划

| 测试项 | 方法 | 预期结果 |
|--------|------|---------|
| 渠道注册 | `GET /api/channels/types` 包含 `pushme` | 列表中出现"PushMe" |
| 创建渠道 | 填写配置并保存 | 渠道创建成功 |
| 文本推送 | 推送纯文本消息 | Android 客户端收到通知 |
| Markdown 推送 | 推送 Markdown 消息 | PushMe 客户端正确渲染 Markdown |
| HTML 推送 | 推送 HTML 消息 | 自动转为纯文本后显示 |
| 测试按钮 | 点击测试 | 发送成功 |
| 无效地址 | 使用错误的服务器地址 | 返回明确错误 |
| 无效 Key | 使用错误的 push_key | 返回"非法push_key!"错误 |
| 空内容 | 不填写 title 和 content | 返回错误提示 |
| 自建服务 | 连接自建 PushMe Server | 正常推送消息 |

## 八、注意事项

### 1. 服务端地址处理
- 官方地址：`https://push.i-i.me`
- 自建地址需要包含端口号（默认 3010）：`http://your-server.com:3010`
- 需要去除 URL 尾部的 `/`

### 2. push_key 验证
- push_key 不能为空
- 支持多个 push_key 用逗号分隔（本实现暂时仅支持单个）
- 服务端会校验 push_key 的有效性

### 3. 消息类型
- 默认为纯文本
- 支持 `type: 'markdown'` 格式
- HTML 内容需转换为纯文本

### 4. 错误处理
- 需要捕获网络超时错误
- 需要处理服务端返回的错误信息
- 需要处理无效的 push_key 错误

### 5. 安全性考虑
- push_key 应该以密码形式存储和显示
- 建议使用 HTTPS（自建服务可配置 TLS/SSL）

## 九、参考资源

- PushMe 官网: https://push.i-i.me/
- PushMe GitHub (客户端): https://github.com/yafoo/pushme
- PushMe GitHub (服务端): https://github.com/yafoo/pushme-server
- PushMe Gitee (客户端): https://gitee.com/yafu/pushme
- PushMe Gitee (服务端): https://gitee.com/yafu/pushme-server
- Telegram 频道: https://t.me/pushme_channel
- Docker 部署命令:
  ```bash
  docker run -dit \
    -p 3010:3010 \
    -p 3100:3100 \
    -e TZ=Asia/Shanghai \
    -v $PWD/pushme-server/config:/pushme-server/config \
    --name pushme-server \
    --restart unless-stopped \
    yafoo/pushme-server:latest
  ```
