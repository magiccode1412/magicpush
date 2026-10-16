# 贡献指南

感谢你对 MagicPush 项目的关注！本文档将引导你完成从环境搭建到提交 PR 的完整流程。

---

## 目录

- [前言](#前言)
- [开发环境搭建](#开发环境搭建)
- [Git 工作流](#git-工作流)
- [代码规范](#代码规范)
- [提交信息规范](#提交信息规范)
- [Pull Request 流程](#pull-request-流程)
- [常见问题](#常见问题)

---

## 前言

### 我可以贡献什么？

无论你是新手还是老手，以下方式都能帮助项目：

- 🐛 **修复 Bug** - 在 [Issues](https://github.com/your-repo/issues) 中挑选未解决的 bug
- ✨ **新功能** - 先提 Issue 讨论，确认后再动手实现
- 📝 **改进文档** - 修正错别字、补充说明、翻译文档
- 💡 **提出建议** - 功能需求、优化思路都可以提 Issue

> **新手友好**：如果你是第一次参与开源，可以在 Issue 标题加上 `[新手]` 前缀，维护者会给予更多指导。

---

## 开发环境搭建

### 前置要求

| 工具 | 最低版本 | 推荐版本 | 安装方式 |
|------|---------|---------|---------|
| Node.js | >= 18.0.0 | LTS (20.x) | [nodejs.org](https://nodejs.org/) |
| pnpm | >= 8.0.0 | 最新版 | `npm i -g pnpm` |
| Git | 任意 | 最新版 | [git-scm.com](https://git-scm.com/) |
| IDE | - | VS Code | [code.visualstudio.com](https://code.visualstudio.com/)（推荐） |

### 1. Fork 并克隆仓库

```
# 1. 在 GitHub 页面点击右上角 "Fork" 按钮，复制到自己的账号下
# 2. 克隆你 fork 的仓库
git clone https://github.com/<你的用户名>/magicpush.git
cd magicpush

# 3. 添加原始仓库为上游（方便后续同步更新）
git remote add upstream https://github.com/原作者/magicpush.git
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd apps/server
pnpm install

# 安装前端依赖
cd ../web
pnpm install

# 如果需要修改官网文档
cd ../website
pnpm install
```

### 3. 启动项目

**终端 1 - 启动后端：**
```bash
cd apps/server
cp .env.example .env   # 首次运行需要配置环境变量（见下方说明）
pnpm dev                # 使用 nodemon 热重载，默认端口 3000
```

**终端 2 - 启动前端：**
```bash
cd apps/web
pnpm dev               # 默认端口 5173
```

访问 `http://localhost:5173` 即可看到页面。

### 环境变量说明

首次运行需要在 `apps/server/.env` 中配置：

```env
# 必填项
PORT=3000                  # 服务端口
JWT_SECRET=your-secret-key # JWT 密钥（随便填一个复杂字符串）

# 可选项（按需填写）
ADMIN_PASSWORD=admin123    # 初始管理员密码
```

---

## Git 工作流

本项目采用 **Fork + Feature Branch** 工作流：

```
┌─────────────┐     fork      ┌───────────────────┐
│   upstream   │ ───────────→ │  你的仓库 (origin)  │
│  (原始仓库)   │              │                   │
└─────────────┘              └───────────────────┘
                                     │
                                  clone
                                     │
                                     ▼
                          ┌───────────────────┐
                          │    本地仓库         │
                          │  ┌─────────────┐  │
                          │  │  dev 分支    │←─┼── 主开发分支（从这里切出新分支）
                          │  ├─────────────┤  │
                          │  │ feat/xxx分支 │←─┼── 你的工作分支
                          │  └─────────────┘  │
                          └───────────────────┘
```

### 具体步骤

#### 1. 保持 dev 分支最新

每次开始新工作前，先同步最新的代码：

```bash
# 切换到 dev 分支
git checkout dev

# 从上游仓库拉取最新代码
git fetch upstream
git merge upstream/dev
```

#### 2. 创建功能分支

从 `dev` 分支创建你的工作分支：

```bash
# 格式: <类型>/<简短描述>
git checkout -b fix/login-error        # 修复：登录报错
git checkout -b feature/add-dark-mode  # 新功能：暗黑模式
git checkout -b docs/update-readme     # 文档：更新 README
```

**分支命名规则：**

| 类型 | 前缀 | 说明 |
|------|------|------|
| Bug 修复 | `fix/` | 修复问题 |
| 新功能 | `feature/` | 新增功能 |
| 文档更新 | `docs/` | 只改文档 |
| 重构 | `refactor/` | 重构代码（不改变行为） |
| 样式调整 | `style/` | 代码格式、分号等 |

#### 3. 编写代码并提交

（详见[代码规范](#代码规范)和[提交信息规范](#提交信息规范)）

#### 4. 推送到你的仓库

```bash
# 推送你的分支到你的 GitHub 仓库
git push origin fix/login-error
```

---

## 代码规范

### 后端 (apps/server/)

**文件命名：** 小驼峰 (`userService.js`, `authController.js`)

**基本结构示例：**

```javascript
// apps/server/src/services/userService.js

const db = require('../database');
const logger = require('../utils/logger');

/**
 * 根据 ID 获取用户
 * @param {number} id 用户 ID
 * @returns {Object|null} 用户对象或 null
 */
function getUserById(id) {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return user;
  } catch (error) {
    logger.error('查询用户失败:', error);
    throw error;
  }
}

module.exports = { getUserById };
```

**注意事项：**
- ✅ 函数要有 JSDoc 注释
- ✅ 用 `try-catch` 包裹可能出错的操作
- ✅ 使用 `logger` 而不是 `console.log`
- ✅ 一个模块只做一件事

### 前端 (apps/web/)

**组件命名：** 大驼峰 (`UserProfile.vue`, `LoginDialog.vue`)

**基本结构示例：**

```vue
<!-- apps/web/src/components/UserProfile.vue -->
<template>
  <div class="user-profile">
    <h2>{{ user.name }}</h2>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const user = ref({});

onMounted(() => {
  user.value = userStore.currentUser;
});
</script>

<style scoped>
.user-profile {
  padding: 16px;
}
</style>
```

**注意事项：**
- ✅ 使用 `<script setup>` 语法
- ✅ 样式加 `scoped` 避免污染全局
- ✅ 组件名要有意义，避免 `Foo.vue`、`Thing.vue` 这种模糊名字

### 不要做的事 ❌

- 不要在提交中包含 `.env` 文件（包含敏感信息）
- 不要在代码中留下 `console.log` 调试语句
- 不要一次性改太多不相关的东西（一个 PR 做一件事）
- 不要跳过本地测试就直接提交

---

## 提交信息规范

我们使用 **Conventional Commits** 规范，格式如下：

```
<类型>(<范围>): <简短描述>

<详细描述（可选）>
```

### 类型列表

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(channel): 支持飞书渠道推送` |
| `fix` | 修复 Bug | `fix(auth): 修复 token 刷新逻辑错误` |
| `docs` | 文档变更 | `docs: 更新部署说明` |
| `style` | 代码格式（不影响功能） | `style: 统一缩进为 2 空格` |
| `refactor` | 重构（不是新功能也不是修复） | `refactor(db): 优化查询语句性能` |
| `perf` | 性能优化 | `perf: 减少首页加载时间` |
| `test` | 测试相关 | `test: 添加登录接口测试用例` |
| `chore` | 构建/工具变动 | `chore: 更新依赖版本` |

### 好的提交信息示例

```bash
# ✅ 好的提交
git commit -m "feat(channel): 新增钉钉机器人推送支持"
git commit -m "fix(login): 修复密码含特殊字符时验证失败的bug"
git commit -m "docs(readme): 补充 Windows 环境安装步骤"

# ❌ 不好的提交
git commit -m "改了一些bug"          # 太模糊
git commit -m "fix"                    # 没有具体内容
git commit -m "feat xxx and fix yyy"   # 一个提交做了两件不同的事
```

---

## Pull Request 流程

### 提交 PR 前的清单

在提交 PR 前，请确认以下几点：

- [ ] 代码可以正常运行（本地测试通过）
- [ ] 提交信息符合上述规范
- [ ] 没有引入不必要的依赖
- [ ] 没有 `console.log` / 调试代码残留
- [ ] 如果修改了 UI，在不同屏幕尺寸下查看效果

### 创建 PR 步骤

1. **打开 GitHub**，进入你 fork 的仓库页面
2. 点击 **"Compare & pull request"** 按钮（如果提示的话）
3. **如果没有提示**：点击 "New Pull Request"，然后：
   - **base repository**: 选择原始仓库的 `dev` 分支
   - **compare**: 选择你刚才推送的分支
4. **填写 PR 信息**（模板如下）

### PR 标题和描述模板

**标题格式：** `[类型] 简短描述`

```
[feat] 支持企业微信 Webhook 推送

## 相关Issue
<!-- 如果有对应的 Issue，填上编号 -->
Closes #123

## 变更内容
<!-- 简要描述你做了什么 -->
- 新增 WeComAdapter 适配器
- 添加企业微信渠道配置界面
- 更新渠道选择下拉框

## 测试方法
<!-- 写清楚如何测试你的改动 -->
1. 进入「渠道管理」页面
2. 新建渠道，选择「企业微信」
3. 填入 Webhook 地址，保存
4. 发送测试消息，验证是否收到

## 截图（可选）
<!-- UI 变更建议附上截图 -->
```

### PR 审核流程

提交后会发生这些事：

```
你提交 PR
    ↓
🤖 自动检查（如果有 CI）
    ↓
👀 维护者进行 Code Review（可能会要求修改）
    ↓
✅ 通过审核 → 合并到 dev 分支
❌ 需要修改 → 你更新代码 → 重新审核
```

**不要害怕被要求修改！** Code Review 是正常的学习过程，不是针对个人。

### PR 被要求修改时

```bash
# 在你的工作分支上继续修改
git add .
git commit -m "fix: 根据review意见修改xxx"
git push origin <你的分支名>
# PR 会自动更新，无需重新创建
```

---

## 同步上游更新（重要！）

如果你的 PR 开发周期较长，期间 `dev` 分支可能有新的提交。合并前需要同步：

```bash
# 切换到 dev 分支
git checkout dev

# 拉取上游最新代码
git fetch upstream
git merge upstream/dev

# 切回你的工作分支，合并最新的 dev
git checkout <你的分支>
git merge dev

# 解决可能的冲突（如果有）
# git status  # 查看冲突文件
# 手动编辑冲突文件，解决后：
# git add <冲突文件>
# git merge --continue

# 重新推送
git push origin <你的分支>
```

---

## 常见问题

### Q: 我的 PR 很小，也可以提交吗？
**A:** 当然可以！哪怕只是修复一个错别字，也是受欢迎的贡献。

### Q: 我不会写代码，能贡献吗？
**A:** 可以！改进文档、报告 Bug、帮忙测试都是很好的贡献方式。

### Q: 提交了错误的代码怎么办？
**A:** 如果还没推送到远程，可以用 `git reset` 撤销；如果已经推送了，可以再提交一次修正。不要慌张。

### Q: Code Review 被批了很多意见，是不是我很差？
**A:** 不是的！所有代码都要经过 Review，这是保证质量的方式。把 Review 当作免费的技术指导就好。

### Q: 冲突解决不了怎么办？
**A:** 可以在 PR 评论里请求帮助，或者在 Issue 里提问。

---

## 致谢

每一位贡献者都值得感谢！你的参与让这个项目变得更好。

 Happy coding! 🎉
