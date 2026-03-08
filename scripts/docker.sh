#!/bin/bash

# Docker 构建推送脚本
# 用法: ./docker.sh [dev]

# 获取参数
BRANCH_TYPE=$1

# 根据分支类型确定主标签
if [ "$BRANCH_TYPE" = "dev" ]; then
    MAIN_TAG="dev"
else
    MAIN_TAG="latest"
fi

BUILD_DIR="."
IMAGE_NAME="${CNB_REPO_SLUG_LOWERCASE}"
CNB_IMAGE_NAME="${CNB_DOCKER_REGISTRY}/${CNB_REPO_SLUG_LOWERCASE}"

echo "========================================"
echo "构建目录: $BUILD_DIR"
echo "CNB 镜像: ${CNB_IMAGE_NAME}:${MAIN_TAG}"
echo "========================================"

# 进入构建目录
cd "$BUILD_DIR" || exit 1

# 构建镜像
echo "[1/3] 开始构建 Docker 镜像..."
docker build -t "${CNB_IMAGE_NAME}:${MAIN_TAG}" .

if [ $? -ne 0 ]; then
    echo "错误: 镜像构建失败"
    exit 1
fi

# 推送到 CNB 仓库
echo "[2/3] 推送镜像到 CNB 仓库..."
docker push "${CNB_IMAGE_NAME}:${MAIN_TAG}"

if [ $? -ne 0 ]; then
    echo "错误: 推送镜像到 CNB 仓库失败"
    exit 1
fi

echo "========================================"
echo "构建推送完成！"
echo "CNB: ${CNB_IMAGE_NAME}:${MAIN_TAG}"
echo "========================================"
