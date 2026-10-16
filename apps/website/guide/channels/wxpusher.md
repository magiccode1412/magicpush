---
title: WxPusher 推送渠道配置指南
description: 通过 WxPusher 服务实现微信推送的完整配置教程
outline: deep
---

# WxPusher 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **WxPusher** 推送渠道，实现向微信推送消息通知。

## 概述

### 什么是 WxPusher？

WxPusher 是一个微信推送服务，支持两种推送方式：

| 推送方式 | 说明 | 适用场景
|----------|------|----------
| **标准推送** | 通过 App Token 推送，需用户关注 | 开发者给用户推送
| **极简推送（SPT）** | 通过 SPT 推送，无需创建应用 | 自己给自己推送

- **官网**：[wxpusher.zjiecode.com](https://wxpusher.zjiecode.com/)
- **文档**：[WxPusher 文档](https://wxpusher.zjiecode.com/docs/)

| 特点 | 说明 |
|------|------|
| 推送目标 | 微信公众号（微信接收） |
| 鉴权方式 | App Token（标准推送）或 SPT（极简推送） |
| 配置复杂度 | 低，根据推送方式填写对应字段 |
| 消息格式 | text、markdown、html |
| 频率限制 | 取决于 WxPusher 套餐 |

### 前置条件

- 拥有微信号（用于接收推送）
- 已注册 [WxPusher 官网](https://wxpusher.zjiecode.com/) 账号（标准推送需要）
- 或已安装 WxPusher 微信小程序（极简推送需要）
- 已部署并登录 MagicPush 管理后台

---

## 第一步：获取配置信息

### 方式一：标准推送（适合开发者给用户推送）

#### 1.1 创建 WxPusher 应用

1. 访问 [WxPusher 官网](https://wxpusher.zjiecode.com/)
2. 点击右上角 **「登录」**，使用微信扫码登录
3. 登录后，点击 **「创建应用」**
4. 填写应用信息：
   - **应用名称**：如 `MagicPush 通知`
   - **应用描述**：可选
5. 点击 **「创建」**

#### 1.2 获取 App Token

创建应用后，在应用详情页可以找到 **「App Token」**，点击复制。

#### 1.3 获取用户 UID（或配置 Topic ID）

**方法一：让用户主动关注**

1. 在应用详情页，找到 **「关注地址」** 或 **「二维码」**
2. 让用户微信扫码关注
3. 用户在 WxPusher 公众号中发送消息后，你可以在控制台查看用户的 **UID**

**方法二：使用 Topic（主题推送）**

1. 在应用详情页，点击 **「主题管理」**
2. 创建一个主题，获取 **Topic ID**
3. 让用户关注该主题（扫码或点击链接）
4. 推送时填写 Topic ID，所有关注该主题的用户都会收到消息

> 📌 **标准推送配置信息**：

| 配置项 | 示例值 | 来源
|--------|--------|------|
| App Token | `AT_xxxxxxxxxxxxxxxx` | 应用详情页
| UID（可选） | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | 用户关注后获取
| Topic ID（可选） | `12345` | 主题管理页面

### 方式二：极简推送 SPT（适合自己给自己推送）

#### 1.1 获取 SPT

1. 在微信中搜索 **「WxPusher 推送」** 小程序
2. 打开小程序，点击 **「获取 SPT」**
3. 复制你的 **SPT**（格式为 `SPT_xxxxxx`）

> 📌 **极简推送配置信息**：

| 配置项 | 示例值 | 来源
|--------|--------|------|
| SPT | `SPT_xxxxxx` | WxPusher 小程序
| SPT 列表（可选） | `SPT_aaa,SPT_bbb` | 多个 SPT 用逗号分隔，最多 10 个

> 💡 **提示**：SPT 和 SPT 列表二选一，请勿同时填写。

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择 **「WxPusher」**。

### 2.3 填写配置信息

根据选择的推送方式，填写对应字段：

#### 标准推送配置

| 字段 | 说明 | 示例
|------|------|------|
| **推送方式** | 选择「标准推送」 | `标准推送`
| **App Token** | 从 WxPusher 管理后台获取 | `AT_xxxxxxxx`
| **UIDs**（可选） | 关注用户的 UID，多个用逗号分隔 | `uid1,uid2`
| **Topic IDs**（可选） | 主题 ID，用于群推 | `12345` 或 `12345,67890`

> 💡 **提示**：UIDs 和 Topic IDs 至少填写一个。如果两者都填写，消息会同时推送给指定用户和主题订阅者。

#### 极简推送配置

| 字段 | 说明 | 示例
|------|------|------|
| **推送方式** | 选择「极简推送 (SPT)」 | `极简推送 (SPT)`
| **SPT** | 单个 SPT，与 SPT 列表二选一 | `SPT_xxxxxx`
| **SPT 列表** | 多个 SPT 用逗号分隔，最多 10 个 | `SPT_aaa,SPT_bbb`

> ⚠️ **注意**：SPT 和 SPT 列表只能填写一个，请勿同时填写。

填写完成后，给渠道起一个易于辨识的**名称**（如「WxPusher 微信推送」），点击 **「保存」**。

### 2.4 测试连通性

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果微信收到「这是一条来自魔法推送的测试消息」，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查

> 💡 **提示**：微信接收消息可能有 1-2 分钟延迟，请耐心等待。

---

## 第三步：使用推送

### 3.1 通过 API 推送

创建渠道后，可以通过 MagicPush 的标准 API 进行推送：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统告警",
    "content": "服务器 CPU 使用率超过 90%，请及时处理",
    "type": "markdown"
  }'
```

支持的消息类型（`type` 参数）：

| type 值 | 说明 | contentType 值
|---------|------|------------------
| `text` | 纯文本消息（默认） | `1`
| `markdown` | Markdown 格式消息 | `3`
| `html` | HTML 格式消息 | `2`

### 3.2 Markdown 消息示例

WxPusher 支持以下 Markdown 语法：

```markdown
## 系统告警通知

**服务器**：192.168.1.100
**告警级别**：<font color="warning">高</font>

> 时间：2024-06-01 14:00
> CPU使用率：95%

请立即处理！
```

### 3.3 HTML 消息示例

当 `type` 为 `html` 时，可以在 `content` 中使用 HTML 标签：

```html
<h2>系统告警通知</h2>
<p><strong>服务器</strong>：192.168.1.100</p>
<p><strong>告警级别</strong>：<span style="color:red;">高</span></p>
<hr>
<p><a href="https://monitor.example.com/alert/12345">查看详情</a></p>
```

---

## 技术细节

### 消息长度限制

- 标题 + 内容：最长不超过 **50000 字符**

### 频率限制

- 免费版：**100 条/天**
- 付费版：根据套餐不同，限制更高

### contentType 映射

MagicPush 会根据 `type` 参数自动设置 `contentType`：

| type | contentType |
|------|-------------
| `text` | `1` |
| `html` | `2` |
| `markdown` | `3` |

---

## 常见问题

### Q: 发送消息返回「App Token 无效」错误？

**原因**：App Token 填写错误。

**解决**：
1. 检查 App Token 是否完整复制，没有多余空格或换行
2. 确认 Token 格式正确（以 `AT_` 开头）
3. 重新从 WxPusher 管理后台复制 App Token

### Q: 极简推送返回「SPT 和 SPT 列表只能二选一」？

**原因**：同时填写了 SPT 和 SPT 列表字段。

**解决**：
1. 只填写 **SPT**（单个推送）
2. 或者只填写 **SPT 列表**（群推，最多 10 个）
3. 请勿同时填写两个字段

### Q: 微信没有收到推送消息？

**原因**：可能有多种情况。

**解决**：
1. 确认微信关注了 WxPusher 公众号（标准推送）
2. 确认在 WxPusher 小程序中获取了 SPT（极简推送）
3. 检查是否开启了消息通知（微信设置 → 新消息通知）
4. 消息可能有 1-2 分钟延迟，请耐心等待
5. 检查 WxPusher 控制台，查看消息发送记录

### Q: 提示「超过每日限制」？

**原因**：免费版每天限制 100 条消息。

**解决**：
1. 升级到付费版（在 WxPusher 控制台中升级）
2. 降低推送频率，合并多条消息为一条
3. 使用其他推送渠道（如企业微信、钉钉等）

### Q: 如何推送到多个用户？

**解决**（标准推送）：
1. 获取多个用户的 UID
2. 在 **「UIDs」** 字段中，用**逗号**分隔多个 UID
3. 或者使用 **Topic**（主题推送），让用户关注主题

**解决**（极简推送）：
1. 获取多个 SPT
2. 在 **「SPT 列表」** 字段中，用**逗号**分隔多个 SPT（最多 10 个）

### Q: UIDs 和 Topic IDs 应该填写哪个？

**回答**：
- 如果知道具体用户的 UID，填写 **UIDs**（精准推送）
- 如果希望所有关注某个主题的用户都收到，填写 **Topic IDs**（群推）
- 也可以两者都填写，消息会同时推送到指定用户和主题订阅者

---

## 参考资源

- [WxPusher 官方网站](https://wxpusher.zjiecode.com/)
- [WxPusher 官方文档](https://wxpusher.zjiecode.com/docs/)
- [WxPusher GitHub](https://github.com/wxpusher)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
