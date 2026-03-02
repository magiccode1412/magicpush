#!/bin/sh

# 初始化数据库
echo "Initializing database..."
cd /app/server
node src/database/init.js

# 启动后端服务
echo "Starting backend server..."
NODE_ENV=production node src/app.js
