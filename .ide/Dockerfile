# .ide/Dockerfile
#
# MagicPush 云原生开发环境（CNB 单容器模式）
# 参考: https://docs.cnb.cool/zh/workspaces/custom-dev-env.html
#
# 说明:
# - CNB 会把仓库代码挂载到 /workspace，本 Dockerfile 只负责构建「环境」（运行时与工具），不打包源码。
# - 单容器模式下，开发容器需自带 code-server 与 ssh，才能同时支持 WebIDE 与 VSCode/Cursor 远程连接。
# - 选用 node:20: 项目 server 依赖 better-sqlite3@9.6.0（engines: node>=18），该版本在 Node 20 下有官方预编译二进制；
#   在更高版本（如 Node 22/24）上既无预编译也无法通过源码编译，因此固定 Node 20。

FROM node:20

# 系统依赖
# - git / wget / unzip / curl: 基础工具（code-server 安装脚本依赖 curl）
# - openssh-server: 支持 VSCode / Cursor 等客户端通过 Remote-SSH 访问开发环境
# - build-essential / python3: 编译 better-sqlite3 等原生模块（预编译下载失败时的兜底）
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        wget \
        unzip \
        curl \
        ca-certificates \
        openssh-server \
        build-essential \
        python3 \
    && rm -rf /var/lib/apt/lists/*

# 启用 pnpm，并固定到项目声明的版本（packageManager: pnpm@10.33.4），保证与 pnpm-lock.yaml 一致
RUN corepack enable \
    && corepack prepare pnpm@10.33.4 --activate

# 安装 code-server 及常用插件（单容器模式需自带 code-server）
# - Vue.volar: 前端基于 Vue 3，提供 .vue 单文件组件的语言特性（高亮/补全/诊断）
# - esbenp.prettier-vscode: 项目使用 Prettier（根目录 .prettierrc.json）
# - bradlc.vscode-tailwindcss: 项目使用 Tailwind CSS 3，提供类名智能提示
# - dbaeumer.vscode-eslint: 代码检查（根目录 eslint.config.js）
# - redhat.vscode-yaml / mhutchie.git-graph / cnbcool.cnb-welcome: 通用工具与 CNB 欢迎页
RUN curl -fsSL https://code-server.dev/install.sh | sh \
    && code-server --install-extension cnbcool.cnb-welcome \
    && code-server --install-extension redhat.vscode-yaml \
    && code-server --install-extension dbaeumer.vscode-eslint \
    && code-server --install-extension mhutchie.git-graph \
    && code-server --install-extension Vue.volar \
    && code-server --install-extension esbenp.prettier-vscode \
    && code-server --install-extension bradlc.vscode-tailwindcss \
    && code-server --install-extension Tencent-Cloud.coding-copilot \
    && code-server --install-extension MS-CEINTL.vscode-language-pack-zh-hans \
    && echo done

# 安装 CodeBuddy Code（提供 codebuddy 命令，用于浏览器中的 CodeBuddy Web，需 >= 2.137.0）
RUN npm install -g @tencent-ai/codebuddy-code

# 安装飞牛fpk工具
RUN cd /root \
    && curl -fsSL -o fnpack https://static2.fnnas.com/fnpack/fnpack-1.2.3-linux-amd64 \
    && chmod +x fnpack \
    && mv fnpack /usr/local/bin/fnpack

# 中文命令行支持
ENV LANG=C.UTF-8
ENV LANGUAGE=C.UTF-8

# CNB 会将仓库代码挂载到 /workspace
WORKDIR /workspace
