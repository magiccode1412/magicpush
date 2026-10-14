---
title: MQTT 推送渠道配置指南
description: 通过 MQTT 协议将消息发布到 Broker，实现物联网 / 智能家居通知的完整配置教程
outline: deep
---

# MQTT 推送渠道配置指南

本教程将指导你如何在 MagicPush（魔法推送）中配置 **MQTT** 推送渠道，把消息发布到任意 MQTT Broker（EMQX / Mosquitto / HiveMQ 等），订阅了该 topic 的客户端（Home Assistant、Node-RED、手机 App 等）即可收到通知。

## 概述

### 什么是 MQTT？

MQTT 是一种轻量级的**发布/订阅（pub/sub）**消息协议，专为网络带宽有限、设备性能受限或网络不稳定的场景设计，广泛用于物联网（IoT）与智能家居。

- **官网**：[mqtt.org](https://mqtt.org/)
- **客户端库**：[MQTT.js](https://github.com/mqttjs/MQTT.js)（本项目后端使用）

| 特点 | 说明 |
|------|------|
| 推送目标 | 任何订阅了该 topic 的 MQTT 客户端（HA、Node-RED、自建脚本等） |
| 鉴权方式 | 用户名 / 密码（取决于 Broker 配置，也可匿名） |
| 配置复杂度 | 低，只需一个可达的 Broker 地址和 topic |
| 消息格式 | JSON（默认，结构化）或 纯文本 |
| 频率限制 | 无限制（取决于 Broker 性能） |

### 前置条件

- 已有一个**可达的 MQTT Broker**（自托管 EMQX / Mosquitto，或使用公共测试 Broker）
- 已部署并登录 MagicPush 管理后台

> 💡 **快速试用公共测试 Broker**：`broker.emqx.io:1883`（明文，无需认证）/ `broker.emqx.io:8883`（TLS）。适合首次验证，生产环境请使用自有 Broker。

---

## 第一步：准备 MQTT 配置信息

| 配置项 | 示例值 | 说明 |
|--------|--------|------|
| Broker 地址 | `mqtts://broker.emqx.io:8883` | 协议支持 `mqtt / mqtts / tcp / tls / ws / wss` |
| 用户名 | `magicpush`（可选） | Broker 开启认证时填写 |
| 密码 | `********`（可选） | 与用户名配对 |
| Topic | `magicpush/alerts` | 消息发布主题，订阅方需订阅同一 topic |

> 🔐 **重要**：Broker 地址与凭据是敏感信息，请妥善保管。使用 `mqtts://`（TLS）可加密传输。

---

## 第二步：在 MagicPush 中添加渠道

### 2.1 进入渠道管理

1. 登录 MagicPush 管理后台（默认地址 `http://<服务器IP>:3000`）
2. 点击左侧导航 **「渠道管理」**
3. 点击右上角 **「+ 绑定渠道」** 按钮

### 2.2 选择渠道类型

在弹出的对话框中，从渠道类型下拉列表中选择 **「MQTT」**。

### 2.3 填写配置信息

| 字段 | 说明 | 示例 |
|------|------|------|
| **Broker 地址** | Broker 连接地址 | `mqtts://broker.emqx.io:8883` |
| **用户名**（可选） | Broker 用户名 | `magicpush` |
| **密码**（可选） | Broker 密码 | `********` |
| **Topic** | 消息发布主题 | `magicpush/alerts` |
| **Client ID**（可选） | 客户端标识，留空自动生成 | `magicpush-xxxx` |
| **QoS** | 服务质量 0/1/2，默认 0 | `0` |
| **消息格式** | JSON（默认）或 纯文本 | `json` |
| **保留消息** | 是否 Retain，默认 否 | `否` |
| **跳过 TLS 证书校验** | 仅自签名证书测试环境用，默认 否 | `否` |

填写完成后，给渠道起一个易于辨识的**名称**（如「MQTT 通知」），点击 **「保存」**。

### 2.4 测试连通性

渠道创建成功后，在渠道卡片右侧的下拉菜单中，点击 **「测试」** 按钮。

- ✅ 如果订阅端收到「这是一条来自魔法推送的测试消息 🎉」，说明配置成功
- ❌ 如果测试失败，请参考下方[常见问题](#常见问题)排查

---

## 第三步：使用推送

### 3.1 通过 API 推送

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

### 3.2 JSON 载荷示例

当 `消息格式` 设为 `json`（默认）时，发布到 topic 的载荷为：

```json
{
  "title": "系统告警",
  "content": "服务器 CPU 使用率超过 90%",
  "type": "text",
  "timestamp": 1728900000000
}
```

订阅端（如 Home Assistant 的 MQTT 传感器 / Node-RED）可直接解析这些字段做自动化。

---

## 技术细节

### QoS（服务质量）

| QoS | 说明 |
|-----|------|
| 0 | 最多一次，最快，可能丢失 |
| 1 | 至少一次，可能重复 |
| 2 | 恰好一次，最可靠，最慢 |

### Retain（保留消息）

开启后，Broker 会保留最后一条消息；新订阅者连接时**立即收到**该消息（常用于「当前状态」类通知）。

### TLS / 证书

- 使用 `mqtts://`、`wss://`、`tls://` 时自动走 TLS 加密。
- 若 Broker 使用**自签名证书**，请将「跳过 TLS 证书校验」设为「是」。`⚠️` 该选项会关闭证书校验，存在中间人攻击风险，**仅限测试环境使用**。

---

## 常见问题

### Q: 测试返回「MQTT 连接或发布超时」？

**原因**：服务器无法在 15 秒内连上 Broker。

**解决**：
1. 确认 Broker 地址与端口正确（注意明文 1883 / TLS 8883）
2. 确认 MagicPush 服务器网络可访问该 Broker（防火墙 / 安全组）
3. 若用 TLS，确认协议为 `mqtts://` 而非 `mqtt://`

### Q: 认证失败 / 连接被拒绝？

**原因**：用户名 / 密码错误，或 Broker 禁止匿名连接却未填凭据。

**解决**：在 Broker 端核对账号，并在 MagicPush 中正确填写用户名与密码。

### Q: 订阅端收不到消息？

**解决**：
1. 订阅端订阅的 topic 必须与配置中的 topic **完全一致**（MQTT topic 区分层级与大小写）
2. 若希望「连接后立刻收到上一条」，可开启「保留消息（Retain）」
3. 用桌面工具 [MQTTX](https://mqttx.app/) 订阅同一 topic 验证 Broker 是否正常

### Q: 自签名证书报证书错误？

**原因**：TLS 校验失败。

**解决**：测试环境下将「跳过 TLS 证书校验」设为「是」；生产环境建议为 Broker 配置受信任的证书。

---

## 参考资源

- [MQTT 官方网站](https://mqtt.org/)
- [EMQX 文档](https://www.emqx.io/docs/zh/v5.0/)
- [Eclipse Mosquitto 文档](https://mosquitto.org/documentation/)
- [MQTT.js 文档](https://github.com/mqttjs/MQTT.js)
- [MagicPush GitHub 仓库](https://github.com/magiccode1412/magicpush)
