# 阶段1: 基础镜像 - 安装pnpm
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# 阶段2: 安装后端依赖
FROM base AS server-deps
WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# 阶段3: 构建前端
FROM base AS web-builder
WORKDIR /app/web
ARG VITE_API_BASE_URL
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ ./
RUN pnpm run build

# 阶段4: 最终运行镜像
FROM node:20-alpine AS final
WORKDIR /app

# 安装时区数据
RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai

# 复制后端依赖
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# 复制后端源码
COPY server/src/ ./server/src/
COPY server/package.json ./server/

# 复制前端构建产物
COPY --from=web-builder /app/web/dist ./web/dist

# 复制版本信息
COPY version.json ./server/

# 创建数据目录
RUN mkdir -p server/data server/logs

EXPOSE 3000

# 启动脚本
COPY scripts/start-docker.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
