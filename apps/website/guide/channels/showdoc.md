---
title: ShowDoc 推送渠道配置指南
description: 通过 ShowDoc 文档平台实现消息推送的完整配置教程
outline: deep
---

# ShowDoc 推送渠道配置指南#

本教程将指导你如何在 MagicPush（魔法推送）中配置 **ShowDoc** 推送渠道，实现向 ShowDoc 文档平台推送消息通知。

## 概述#

### 什么是 ShowDoc 推送？#

ShowDoc 是一个在线文档协作平台，提供推送接口，可以将消息推送到 ShowDoc 的文档页面中（以消息形式展示）。

- **官网**：[showdoc.com.cn](https://www.showdoc.com.cn/)
- **推送文档**：[showdoc.com.cn/push](https://www.showdoc.com.cn/push)

| 特点 | 说明 |
|------|------|
| 推送目标 | ShowDoc 文档页面（通过推送 URL 标识） |
| 鉴权方式 | URL 中包含 Token（无需额外配置） |
| 配置复杂度 | 低，仅需粘贴推送 URL |
| 消息格式 | title + content（纯文本） |
| 频率限制 | 取决于 ShowDoc 套餐 |

### 前置条件#

- 拥有 ShowDoc 账号（[注册地址](https://www.showdoc.com.cn/)）
- 已创建一个 ShowDoc 项目
- 已部署并登录 MagicPush 管理后台#

---

## 第一步：在 ShowDoc 中获取推送 URL#

### 1.1 登录 ShowDoc#

1. 访问 [ShowDoc 官网](https://www.showdoc.com.cn/)
2. 点击右上角 **「登录」**
3. 使用账号密码或第三方登录#

### 1.2 获取推送 URL#

1. 登录后，进入你的 **ShowDoc 项目**
2. 点击右上角 **「设置」** → **「推送」**
3. 找到 **「推送 URL」**，点击 **「复制」**#

> 📌 **推送 URL 示例**：
> ```
> https://push.showdoc.com.cn/server/api/push/your_token
> ```

> 🔐 **重要**：推送 URL 中已包含认证 Token，无需额外配置鉴权。

至此，你已获得配置所需的信息：

| 配置项 | 示例值 | 来源 |
|--------|--------|------|
| 推送 URL | `https://push.showdoc.com.cn/...` | ShowDoc 项目设置 → 推送 |#

---

## 第二步：在 MagicPush 中添加渠道#

### 2.1 进入渠道管理#

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮#

### 2.2 选择渠道类型#

在弹出的对话框中，从渠道类型下拉列表中选择 **「ShowDoc」**。

### 2.3 填写配置信息#

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **推送 URL** | ShowDoc 提供的专属推送地址（包含认证信息） | `https://push.showdoc.com.cn/server/api/push/your_token` |#

> 💡 **提示**：
> - 推送 URL 是完整地址，包含 Token，直接粘贴即可
> - URL 格式通常为 `https://push.showdoc.com.cn/server/api/push/<token>`
> - 如果 URL 格式不正确，MagicPush 会提示「推送 URL 格式不正确」

填写完成后，给渠道起一个易于辨识的**名称**（如「ShowDoc 消息推送」），点击 **「保存」**。

### 2.4 测试连通性#

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 ShowDoc 文档中收到测试消息，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查#

---

## 第三步：使用推送#

### 3.1 通过 API 推送#

创建渠道后，可以通过 MagicPush 的标准 API 进行推送：

```bash
curl -X POST http://<服务器IP>:3000/api/push/<渠道ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的API Token>" \
  -d '{
    "title": "系统告警",
    "content": "服务器 CPU 使用率超过 90%，请及时处理",
    "type": "text"
  }'
```

> 📌 ShowDoc **只支持 `text` 类型**消息（`title` + `content`）。`markdown` 和 `html` 类型会被自动转换为纯文本。

### 3.2 在 ShowDoc 中查看推送消息#

1. 打开你的 ShowDoc 项目页面
2. 推送的消息会显示在项目的**消息面板**中
3. 可以在 ShowDoc 中配置**消息提醒**（如邮件提醒、微信提醒等）#

---

## 技术细节#

### 消息格式#

ShowDoc 推送接口接收以下参数：

| 参数 | 类型 | 说明 |
|--------|------|------|
| `title` | String | 消息标题（可选，默认「通知」） |
| `content` | String | 消息内容（必填） |#

MagicPush 会自动将 `title` 和 `content` 映射到 ShowDoc 的期望格式（`application/x-www-form-urlencoded`）。

### 频率限制#

- 取决于你的 ShowDoc 套餐
- 免费版有合理的限制，具体请参考 [ShowDoc 定价页面](https://www.showdoc.com.cn/)

### 错误处理#

| ShowDoc 错误码 | 说明 | 解决方法 |
|----------------|------|----------|
| `error_code !== 0` | 推送失败 | 检查推送 URL 是否正确，Token 是否有效 |#

---

## 常见问题#

### Q: 发送消息返回「推送 URL 不能为空」错误？#

**原因**：推送 URL 字段未填写。

**解决**：
1. 在 ShowDoc 项目设置 → 推送中，复制推送 URL
2. 粘贴到 MagicPush 的「推送 URL」字段
3. 确保 URL 完整，没有多余空格

### Q: 发送消息返回「推送 URL 格式不正确」？#

**原因**：URL 格式不符合 ShowDoc 推送 URL 规范。

**解决**：
1. 确认 URL 以 `https://` 或 `http://` 开头
2. 确认 URL 包含 `push.showdoc.com.cn` 或你的自托管域名
3. 重新从 ShowDoc 复制推送 URL

### Q: ShowDoc 中没有收到推送消息？#

**原因**：可能有多种情况。

**解决**：
1. 确认推送 URL 中的 Token 是正确的（在 ShowDoc 项目设置中核对）
2. 检查 ShowDoc 项目是否已达到消息限制
3. 查看 MagicPush 日志，确认是否有错误信息
4. 在 ShowDoc 中检查是否有消息过滤规则

### Q: 如何同时推送到多个 ShowDoc 项目？#

**解决**：
1. 在每个 ShowDoc 项目中获取推送 URL
2. 在 MagicPush 中创建多个 ShowDoc 渠道，每个对应一个推送 URL
3. 分别测试每个渠道的连通性

### Q: 自托管 ShowDoc 的推送 URL 格式？#

**解决**：
1. 自托管 ShowDoc 的推送 URL 格式为：
   ```
   https://your-showdoc-domain.com/server/api/push/your_token
   ```
2. 将自托管地址填写到 MagicPush 的「推送 URL」字段
3. 确保自托管服务可访问

### Q: 消息内容支持 Markdown 或 HTML 吗？#

**回答**：不支持。ShowDoc 推送只支持**纯文本** `title` 和 `content`。如果需要富文本，可以考虑其他渠道（如企业微信应用、钉钉等）。

---

## 参考资源#

- [ShowDoc 官方网站](https://www.showdoc.com.cn/)
- [ShowDoc 推送文档](https://www.showdoc.com.cn/push)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
