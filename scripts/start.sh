#!/bin/bash

echo "🚀 启动 MagicPush..."
echo ""

# 启动后端服务
echo "📦 启动后端服务 (http://localhost:3000)..."
cd /workspace/server
pnpm start &
SERVER_PID=$!

# 等待后端启动
sleep 2

# 启动前端服务
echo "🎨 启动前端服务 (http://localhost:5173)..."
cd /workspace/web
pnpm run dev &
WEB_PID=$!

echo ""
echo "✅ 服务已启动！"
echo "📌 前端访问地址: http://localhost:5173"
echo "📌 后端API地址: http://localhost:3000"
echo "📌 API文档: http://localhost:5173/settings"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获终止信号
trap "kill $SERVER_PID $WEB_PID; exit" SIGINT SIGTERM

# 等待进程
wait
