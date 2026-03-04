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
echo "DockerHub 镜像: ${IMAGE_NAME}:${MAIN_TAG}"
echo "CNB 镜像: ${CNB_IMAGE_NAME}:${MAIN_TAG}"
echo "========================================"

# 进入构建目录
cd "$BUILD_DIR" || exit 1

# 构建镜像
echo "[1/5] 开始构建 Docker 镜像..."
docker build -t "${IMAGE_NAME}:${MAIN_TAG}" .

if [ $? -ne 0 ]; then
    echo "错误: 镜像构建失败"
    exit 1
fi

# 登录 DockerHub
echo "[2/5] 登录 DockerHub..."
if [ -z "$DOCKERHUB_TOKEN" ] || [ -z "$DOCKERHUB_USERNAME" ]; then
    echo "错误: 请设置 DOCKERHUB_TOKEN 和 DOCKERHUB_USERNAME 环境变量"
    exit 1
fi
DOCKER_CLI_HINTS=false echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

if [ $? -ne 0 ]; then
    echo "错误: DockerHub 登录失败"
    exit 1
fi

# 推送到 DockerHub
echo "[3/5] 推送镜像到 DockerHub..."
docker push "${IMAGE_NAME}:${MAIN_TAG}"

if [ $? -ne 0 ]; then
    echo "错误: 推送镜像到 DockerHub 失败"
    exit 1
fi

# 重新打 CNB 标签
echo "[4/5] 重新打 CNB 标签..."
docker tag "${IMAGE_NAME}:${MAIN_TAG}" "${CNB_IMAGE_NAME}:${MAIN_TAG}"

if [ $? -ne 0 ]; then
    echo "错误: 打 CNB 标签失败"
    exit 1
fi

# 推送到 CNB 仓库
echo "[5/5] 推送镜像到 CNB 仓库..."
docker push "${CNB_IMAGE_NAME}:${MAIN_TAG}"

if [ $? -ne 0 ]; then
    echo "错误: 推送镜像到 CNB 仓库失败"
    exit 1
fi

echo "========================================"
echo "构建推送完成！"
echo "DockerHub: ${IMAGE_NAME}:${MAIN_TAG}"
echo "CNB: ${CNB_IMAGE_NAME}:${MAIN_TAG}"
echo "========================================"
