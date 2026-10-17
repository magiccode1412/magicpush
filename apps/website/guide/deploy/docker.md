---
title: Docker 部署
description: 使用 Docker 或 docker-compose 部署 MagicPush 服务
---

# Docker 部署

本文介绍如何使用 Docker 快速部署 MagicPush 推送服务。

## 镜像地址

| 源 | 地址 |
|---|---|
| **默认（Docker Hub）** | `magiccode1412/magicpush:latest` |
| **国内加速** | `docker.cnb.cool/magiccode1412/magicpush:latest` |

> 国内用户建议使用国内源，拉取速度更快。
>
> 如需固定版本，可使用版本标签替代 `latest`，例如：
> - `magiccode1412/magicpush:1.12.0`
> - `docker.cnb.cool/magiccode1412/magicpush:1.12.0`
>
> 生产环境推荐固定版本号，避免自动更新带来的兼容性问题。

## 使用 Docker 部署

```bash
# 拉取镜像
docker pull magiccode1412/magicpush:latest

# 运行容器（带数据持久化）
docker run -d \
  --name magicpush \
  -p 818:3000 \
  -v ./data:/app/server/data \
  -v ./logs:/app/server/logs \
  magiccode1412/magicpush:latest
```

> 数据持久化说明：
> - `./data` → 容器内 `/app/server/data`，存储 SQLite 数据库文件（`push_service.db`）
> - `./logs` → 容器内 `/app/server/logs`，存储应用日志文件（`error.log`、`combined.log`）

## 使用 docker-compose 部署

创建 `docker-compose.yml` 文件：

```yaml
services:
  magicpush:
    image: magiccode1412/magicpush:latest
    container_name: magicpush
    network_mode: bridge
    ports:
      - "818:3000"
    volumes:
      - ./data:/app/server/data   # 数据库持久化
      - ./logs:/app/server/logs   # 日志持久化
    environment:
      - TZ=Asia/Shanghai          # 可选项，默认东八区
    restart: unless-stopped
```

运行：

```bash
docker compose up -d
```

## 访问管理后台

部署成功后，访问 `http://<服务器IP>:818` 即可进入 MagicPush 管理后台。

## 反向代理部署（推荐）

MagicPush 后端默认设计为运行在**反向代理（Nginx / 宝塔 / 雷池 WAF / Lucky 等）之后**，**不建议将后端端口（默认 `3000`）直接暴露到公网**。

### 为什么必须放在反向代理之后

后端依赖 `X-Forwarded-For` 请求头获取真实客户端 IP，用于限速、审计日志与推送归因。若后端可被客户端直连，客户端即可伪造该头，导致基于 IP 的限速、审计与地理位置功能失效。因此请将后端端口限制为**仅允许反向代理访问**（防火墙 / 容器网络 / 安全组隔离）——这是防止 IP 伪造的真正边界，比任何配置都关键。

### TRUST_PROXY 配置

后端使用 Express 的 `trust proxy` 机制解析真实客户端 IP，可通过环境变量 `TRUST_PROXY` 覆盖（**不填默认 `1`，即信任单反代**）：

| 取值 | 含义 |
|---|---|
| 不填 / `1` | 默认「客户端 → 反代 → 后端」单跳，信任第 1 跳 |
| `0` | 直连 / 本地开发，不信任任何 `X-Forwarded-For`，退回 TCP 对端地址 |
| `2` | 反代之前还叠了 1 个受信代理（例如反代之后又挂了雷池） |
| `172.17.0.0/16,10.0.0.0/8` | 逗号分隔的 CIDR/IP 列表：仅当对端 IP 落入该网段才算受信跳（更安全，且自动跳过正确跳数） |

docker-compose 中配置示例：

```yaml
services:
  magicpush:
    image: magiccode1412/magicpush:latest
    container_name: magicpush
    network_mode: bridge
    ports:
      - "818:3000"
    volumes:
      - ./data:/app/server/data   # 数据库持久化
      - ./logs:/app/server/logs   # 日志持久化
    environment:
      - TZ=Asia/Shanghai
      # 反代与后端在同一 Docker 网络时，可用 CIDR 形式更严格，例如 172.17.0.0/16
      - TRUST_PROXY=1
    restart: unless-stopped
```

### 反向代理配置要求

- 反代必须对 `X-Forwarded-For` 做**追加**（标准行为），并保证公网侧客户端无法篡改最右端那一项。
- 若使用宝塔且站点接入了 CDN，请在宝塔中开启「使用 CDN」：宝塔会帮你吸收 CDN 这一跳，此时后端仍按单反代（`TRUST_PROXY=1`）处理即可。
- 若反代之前还叠加了其它受信代理（例如雷池在反代之前），请将 `TRUST_PROXY` 调大，或改用 CIDR 列表形式。

## 目录结构说明

部署后会生成以下本地目录：

```
├── data/
│   └── push_service.db       # SQLite 数据库
├── logs/
│   ├── error.log             # 错误日志
│   └── combined.log          # 综合日志
```

建议将 `data/` 和 `logs/` 目录纳入备份策略，避免数据丢失。
