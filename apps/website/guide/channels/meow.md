---
title: Meow 推送渠道配置指南
description: 通过 Meow 鸿蒙应用实现消息推送的完整配置教程
outline: deep
---

# Meow 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **Meow** 推送渠道，实现向鸿蒙设备推送消息通知。

## 概述

### 什么是 Meow？

Meow 是一款专为**鸿蒙系统-HarmonyOS**开发的推送通知应用，可以将消息推送到鸿蒙设备。

- **官网**：[api.chuckfang.com](https://api.chuckfang.com/)
- **App 获取**：在鸿蒙应用市场搜索「Meow」

| 特点 | 说明 |
|------|------|
| 推送目标 | 鸿蒙设备（需安装 Meow App） |
| 鉴权方式 | 用户昵称（无需 Token） |
| 配置复杂度 | 低，仅需用户昵称 |
| 消息格式 | text（纯文本）、markdown（原生渲染）、html（HTML 渲染） |
| 系统要求 | HarmonyOS 2.0+ |

### 前置条件

- 拥有鸿蒙系统设备（华为手机/平板）
- 已安装 Meow App
- 已部署并登录 MagicPush 管理后台

---

## 第一步：在 Meow App 中设置昵称

### 1.1 安装并打开 Meow

1. 在鸿蒙应用市场搜索 **「Meow」** 并安装
2. 打开 Meow App
3. 首次打开会要求设置**用户昵称**

### 1.2 设置并记住昵称

1. 在 App 设置页面，找到 **「用户昵称」**
2. 设置一个**易记且不易被猜到**的昵称（这相当于你的推送凭证）
3. 点击 **「保存」**

> 📌 **关键信息**：
> | 配置项 | 示例值 | 来源 |
> |--------|--------|------|
> | 用户昵称 | `my_alert_bot` | Meow App 设置页面 |
>
> 💡 **提示**：昵称相当于密码，不要使用常见单词，建议使用下划线连接随机词。

> ⚠️ **注意**：昵称不能包含斜杠（`/`）。

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理#

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型#

在弹出的对话框中，从渠道类型下拉列表中选择 **「Meow」**。

### 2.3 填写配置信息#

根据第一步获取的信息，填写以下配置字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **用户昵称** | 在 Meow App 中设置的昵称 | `my_alert_bot` |
| **默认消息类型** | text=纯文本（默认），markdown=渲染 Markdown，html=渲染 HTML | `text` |
| **HTML 显示高度** | 仅消息为 HTML 时生效，单位像素 | `200` |

> 💡 **消息类型说明**：
> - `text`：纯文本显示，所有格式标记以文本形式展示
> - `markdown`：原生 Markdown 渲染，由 Meow App 直接渲染（**不再手动转为纯文本**）
> - `html`：在 App 中渲染 HTML 格式（支持更多样式）

填写完成后，给渠道起一个易于辨识的**名称**（如「Meow 鸿蒙推送」），点击 **「保存」**。

### 2.4 测试连通性#

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果 Meow App 收到「这是一条来自魔法推送的测试消息」，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查

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

支持的消息类型（`type` 参数）：

| type 值 | 说明 |
|---------|------|
| `text` | 纯文本消息（默认） |
| `markdown` | Markdown 格式，由 Meow App 原生渲染 |
| `html` | HTML 格式，由 Meow App 渲染 |

---

### 3.2 附加参数（extraData.meow）

除顶层 `title`/`content` 外，Meow 还支持通过 `extraData.meow` 命名空间传入以下参数。其中 `title`/`content` 用于为 Meow 单独指定内容（缺省时回退顶层），`url`/`imgUrl`/`htmlHeight`/`channelType` 用于设置跳转链接、通知图标、HTML 高度及渲染类型。

::: tip 为 Meow 指定独立内容
`extraData.meow` 是一个「自包含」命名空间。**典型场景**：多渠道推送时全局 `type=text`（纯文本），但希望 Meow 渲染独立的 markdown/html。此时只需在 `extraData.meow` 中同时写入 `channelType` 与 `title`/`content`，Meow 就会发送属于它自己的富文本，而不影响其他渠道。
:::

::: tip 命名空间隔离
附加参数采用**命名空间隔离**设计，Meow 的参数必须放在 `extraData.meow` 对象内：

```json
{
  "extraData": {
    "meow": {
      "title": "系统告警",
      "content": "服务器 CPU 使用率超过 90%",
      "url": "https://monitor.example.com/alert/12345",
      "imgUrl": "https://example.com/icon.png",
      "channelType": "markdown",
      "htmlHeight": "400"
    }
  }
}
```
:::

| 参数 | 说明 | 典型场景 |
|------|------|----------|
| `title` | Meow 单独标题（可选，缺省回退顶层 `title`） | 多渠道推送时为 Meow 设置不同标题 |
| `content` | Meow 单独内容（可选，缺省回退顶层 `content`） | 多渠道推送时为 Meow 设置独立正文本/markdown/html |
| `url` | 点击通知后的跳转链接 | 跳转监控详情页、工单系统 |
| `imgUrl` | 通知图标 URL（建议 216×216 PNG） | 自定义通知图标、品牌化展示 |
| `htmlHeight` | HTML 消息的显示高度（像素，默认 200），仅 `html` 类型生效 | 控制富文本消息的展示区域高度 |
| `channelType` | 单独为 Meow 指定渲染类型：`text` / `markdown` / `html` | 多渠道推送时单独指定 Meow 渲染方式，不影响其他渠道 |

::: tip 使用方式
附加参数直接放在 `extraData.meow` 对象中，与全局 `type` 互不干扰。其中 `channelType` 用于多渠道推送场景下单独指定 Meow 的渲染类型，其他渠道仍按各自方式发送。
:::

## 常见问题#

### Q: 发送消息返回「用户昵称不能为空」错误？

**原因**：昵称字段未填写。

**解决**：
1. 在 Meow App 中设置用户昵称
2. 将昵称填写到 MagicPush 渠道配置中
3. 确保昵称不包含斜杠（`/`）

### Q: 鸿蒙设备没有收到推送消息？

**原因**：可能有多种情况。

**解决**：
1. 确认 Meow App 在后台运行（鸿蒙可能被杀后台）
2. 检查鸿蒙通知权限是否开启（设置 → 应用 → Meow → 通知）
3. 确认昵称拼写正确
4. 测试消息可能有短暂延迟，请耐心等待

### Q: 如何推送到多个设备？

**解决**：
1. 在每个鸿蒙设备上安装 Meow App
2. 每个设备设置**不同的昵称**
3. 在 MagicPush 中创建多个 Meow 渠道，每个对应一个昵称

### Q: HTML 消息没有正确渲染？

**原因**：可能未选择 `html` 消息类型。

**解决**：
1. 在 MagicPush 渠道配置中，将「消息类型」选择为 `HTML`
2. 确认 HTML 标签是标准格式
3. 不支持的标签会被忽略或显示为文本

### Q: 昵称可以修改吗？

**回答**：可以。在 Meow App 中修改昵称后，同步修改 MagicPush 渠道配置中的昵称即可。

### Q: 消息类型应该选哪个？#

| 场景 | 推荐类型 |
|------|----------
| 简单文本通知 | `text` |
| 结构化文档（标题、列表、加粗等） | `markdown` |
| 需要丰富样式（颜色、链接等） | `html` |

---

## 参考资源#

- [Meow API 文档](https://www.chuckfang.com/MeoW/api_doc.html)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
