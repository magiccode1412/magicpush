# 阶段1: 构建依赖
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# 阶段2: 运行镜像
FROM node:20-alpine AS final
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
COPY ../version.json ./
RUN mkdir -p data logs

EXPOSE 3000
CMD ["sh", "-c", "node src/database/init.js && node src/app.js"]
