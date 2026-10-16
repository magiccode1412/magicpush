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
