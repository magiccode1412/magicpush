# 前端开发指南

本文档说明 MagicPush 前端项目的架构、组件规范、路由组织、状态管理等。

---

## 目录

- [1. 技术栈](#1-技术栈)
- [2. 项目结构](#2-项目结构)
- [3. 路由与页面](#3-路由与页面)
- [4. 组件开发规范](#4-组件开发规范)
- [5. 状态管理 (Pinia)](#5-状态管理-pinia)
- [6. API 请求封装](#6-api-请求封装)
- [7. 样式方案](#7-样式方案)
- [8. 新增页面步骤](#8-新增页面步骤)
- [9. 测试（Vitest）](#9-测试vitest)

---

## 1. 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue 3** | ^3.4.x | 前端框架（Composition API） |
| **Vite** | ^5.2.x | 构建工具（热更新、打包） |
| **Element Plus** | ^2.6.x | UI 组件库 |
| **Tailwind CSS** | ^3.4.x | 原子化 CSS 框架 |
| **Pinia** | ^2.1.x | 状态管理 |
| **Vue Router** | ^4.3.x | 路由管理 |
| **Axios** | ^1.15.x | HTTP 请求客户端 |
| **lucide-vue-next** | ^0.363.x | 图标库 |
| **Vitest** | ^1.6.x | 单元测试框架（store 单测） |

---

## 2. 项目结构

```
apps/web/src/
├── App.vue                    # 根组件（页面切换动画）
├── main.js                    # 应用入口
│
├── api/                       # API 接口封装
│   ├── request.js             # Axios 实例（拦截器、自动Token刷新）
│   ├── auth.js                # 认证相关 API
│   ├── user.js                # 用户 API
│   ├── channel.js             # 渠道通用 CRUD API
│   ├── clawbot.js             # 微信龙虾机器人绑定 API（渠道专属）
│   ├── misound.js             # 小爱音箱扫码登录 API（渠道专属）
│   ├── yuanbaobot.js          # 元宝Bot绑定 API（渠道专属）
│   ├── endpoint.js            # 接口 API
│   ├── push.js                # 推送 API
│   ├── log.js                 # 日志 API
│   └── admin.js               # 管理员 API
│
├── components/                # 可复用组件
│   ├── Layout/               # 主布局组件
│   │   └── MainLayout.vue     # 侧边栏 + 顶栏 + 内容区
│   ├── ClawbotBindDialog.vue  # 龙虾机器人绑定对话框
│   ├── MisoundBindDialog.vue  # 小爱音箱扫码绑定对话框
│   ├── YuanbaobotBindDialog.vue
│   └── VersionUpdateDialog.vue
│
├── router/
│   └── index.js               # 路由定义 + 导航守卫
│
├── stores/                     # Pinia Store
│   ├── auth.js                # 认证状态
│   ├── settings.js            # 应用设置
│   └── theme.js              # 主题状态
│
├── views/                      # 页面视图
│   ├── Dashboard.vue          # 首页仪表板
│   ├── Login.vue / Register.vue
│   ├── endpoints/List.vue     # 接口管理
│   ├── channels/List.vue      # 渠道管理
│   ├── logs/List.vue          # 推送记录
│   ├── settings/Index.vue     # 设置首页
│   ├── settings/Security.vue  # 安全设置
│   ├── admin/Users.vue        # 用户管理
│   ├── Docs.vue               # API 文档页
│   ├── Debug.vue             # 调试测试
│   ├── About.vue             # 关于页面
│   └── Changelog.vue         # 更新日志
│
├── styles/
│   └── index.css              # 全局样式
│
└── utils/
    ├── request.js             # Axios 配置
    └── version.js            # 版本检测工具
```

---

## 3. 路由与页面

### 3.1 路由配置方式

使用 Vue Router 4 的嵌套路由 + 懒加载：

```javascript
// apps/web/src/router/index.js
const routes = [
  {
    path: '/',
    component: MainLayout,           // 主布局作为父级
    meta: { requiresAuth: true },    // 需要认证
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),  // 懒加载
      },
      {
        path: 'endpoints',
        name: 'Endpoints',
        component: () => import('@/views/endpoints/List.vue'),
      },
      // ... 其他子路由
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },          // 公开页面
  },
];
```

### 3.2 路由元信息 (meta)

```javascript
meta: {
  public: true,       // 公开页面（无需登录）
  admin: true,        // 仅管理员可访问
  title: '页面标题',   // 页面标题
}
```

### 3.3 导航守卫

```javascript
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // 公开页面直接放行
  if (to.meta.public) return next();

  // 未登录跳转登录页
  if (!authStore.isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  next();
});
```

---

## 4. 组件开发规范

### 4.1 文件命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 页面视图 | PascalCase`.vue` | `Dashboard.vue`, `About.vue` |
| 功能子页面 | `{模块}/PascalCase.vue` | `endpoints/List.vue`, `settings/Security.vue` |
| 通用组件 | PascalCase`.vue` | `MainLayout.vue` |
| 对话框 | 以 `Dialog.vue` 结尾 | `ClawbotBindDialog.vue` |

### 4.2 组件结构模板

```vue
<template>
  <div class="xxx-page">
    <!-- 使用 Element Plus + Tailwind CSS -->
    <el-card>
      <template #header>
        <div class="flex items-center justify-between">
          <h3>页面标题</h3>
          <el-button type="primary" @click="handleAdd">新增</el-button>
        </div>
      </template>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="name" label="名称" />
        <!-- ... -->
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="page"
        :total="total"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getXxxList } from '@/api/xxx'

// 路由和状态
const router = useRouter()
const authStore = useAuthStore()

// 响应式数据
const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const total = ref(0)

// 方法
const fetchData = async () => {
  loading.value = true
  try {
    const res = await getXxxList({ page: page.value })
    if (res.success) {
      tableData.value = res.data.list
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  // ...
}

// 生命周期
onMounted(() => {
  fetchData()
})
</script>
```

### 4.3 Composition API 规范

- 使用 `<script setup>` 语法糖（推荐）
- 响应式变量用 `ref()`，对象用 `reactive()`
- 从 Vue 和 Pinia 显式导入所需函数
- 异步操作配合 `v-loading` 显示加载状态
- 错误处理使用 `ElMessage.error()`

---

## 5. 状态管理 (Pinia)

### 5.1 Setup Store 模式

```javascript
// apps/web/src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const accessToken = ref(localStorage.getItem('accessToken') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')

  // Getters
  const isAuthenticated = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // Actions
  function setAuthData(data) {
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken
    user.value = data.user
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
  }

  async function logout() {
    accessToken.value = ''
    refreshToken.value = ''
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    setAuthData,
    logout,
  }
})
```

### 5.2 命名约定

- Store 文件：`camelCase.js`（如 `auth.js`）
- Store 函数：`use + PascalCase`（如 `useAuthStore`）
- Store 内部：State → `ref()`，Getters → `computed()`，Actions → 普通函数

---

## 6. API 请求封装

### 6.1 Axios 实例配置

文件：`apps/web/src/api/request.js`

```javascript
import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
})

// 请求拦截器：自动携带 Token
request.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }
    return config
  }
)

// 响应拦截器：自动处理 401 和无感刷新
request.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      if (authStore.refreshToken) {
        try {
          // 尝试刷新 Token
          const res = await axios.post('/api/auth/refresh', {
            refreshToken: authStore.refreshToken,
          })
          authStore.setAuthData(res.data.data)
          // 重试原请求
          error.config.headers.Authorization = `Bearer ${res.data.data.accessToken}`
          return request(error.config)
        } catch {
          authStore.logout()
          router.push('/login')
        }
      }
    }

    const msg = error.response?.data?.message || '请求失败'
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export default request
```

### 6.2 API 模块示例

#### 通用 CRUD API（以渠道为例）

```javascript
// apps/web/src/api/channel.js
import request from './request'

// 获取渠道列表
export function getChannelList() {
  return request.get('/channels')
}

// 创建渠道
export function createChannel(data) {
  return request.post('/channels', data)
}

// 测试渠道发送
export function testChannel(channelId) {
  return request.post(`/channels/${channelId}/test`)
}
```

#### 渠道专属 API（独立文件模式）

对于需要特殊绑定流程的渠道（如扫码登录），API 应**独立成文件**：

```javascript
// apps/web/src/api/clawbot.js - 微信龙虾机器人绑定
import request from './request'

export function getClawbotQRCode() {
  return request.post('/channels/clawbot/bind/qrcode')
}

export function clawbotBindConfirm(data) {
  return request.post('/channels/clawbot/bind/confirm', data)
}

// apps/web/src/api/misound.js - 小爱音箱扫码登录
import request from './request'

export function initQRLogin() {
  return request.post('/channels/misound/qr/init')
}

export function pollQRStatus(sessionId) {
  return request.get('/channels/misound/qr/status', { params: { sessionId } })
}
```

**API 模块规范：**
- **通用CRUD API**：放在对应资源的主文件中（如 `channel.js`）
- **渠道专属 API**：独立文件，命名 `{平台名}.js`（如 `clawbot.js`, `misound.js`）
- 函数名使用 camelCase：`getXxxList`, `createXxx`, `initXxx`
- 直接返回 Axios Promise，不做额外包装
- 错误处理统一在响应拦截器中处理

---

## 7. 样式方案

### 7.1 Tailwind CSS 为主

优先使用 Tailwind 工具类进行布局和样式：

```vue
<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">
        标题
      </h2>
      <el-button type="primary">操作</el-button>
    </div>
  </div>
</template>
```

### 7.2 暗色模式支持

Tailwind 使用 `dark:` 前缀：

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

Element Plus 暗色模式在全局样式中通过 HTML class 切换。

### 7.3 自定义样式

项目特有的全局样式放在 `apps/web/src/styles/index.css` 中。避免在组件中使用 `<style scoped>`，优先使用 Tailwind 类名或 Element Plus 组件属性控制样式。

---

## 8. 新增页面步骤

以新增「通知模板」页面为例：

### 步骤 1：创建 API 模块

```javascript
// apps/web/src/api/template.js
import request from './request'

export function getTemplateList(params) {
  return request.get('/templates', { params })
}

export function createTemplate(data) {
  return request.post('/templates', data)
}

export function updateTemplate(id, data) {
  return request.put(`/templates/${id}`, data)
}

export function deleteTemplate(id) {
  return request.delete(`/templates/${id}`)
}
```

### 步骤 2：创建页面组件

```vue
<!-- apps/web/src/views/templates/List.vue -->
<template> ... </template>
<script setup> ... </script>
```

### 步骤 3：注册路由

```javascript
// apps/web/src/router/index.js
{
  path: 'templates',
  name: 'Templates',
  component: () => import('@/views/templates/List.vue'),
}
```

### 步骤 4：添加侧边栏导航入口

在 `MainLayout.vue` 的侧边栏菜单中添加对应的导航项。

---

## 9. 测试（Vitest）

前端已引入 [Vitest](https://vitest.dev/) 作为单元测试框架，用于覆盖核心 store 逻辑（如 `auth` / `settings`）。

### 9.1 运行命令

在 `apps/web/` 目录下执行：

```bash
pnpm test          # 运行全部测试（vitest run）
pnpm test:watch    # 监听模式，文件变更自动重跑
```

### 9.2 编写规范

- 测试文件与被测模块同目录，以 `*.spec.js` 结尾，例如 `src/stores/auth.js` 对应 `src/stores/auth.spec.js`。
- store 测试使用 `setActivePinia(createPinia())` 创建独立实例，并在 `beforeEach` 中 `localStorage.clear()` 隔离状态。
- 通过 `vi.mock('@/api/auth')` 等方式注入假实现，避免触达真实网络 / UI 依赖。
- 依赖外部服务（如真实接口）的用例一律使用 Mock，不发起真实请求。

> CI 中已自动运行前端测试：`.github/workflows/ci.yml` 的 `web-test` 任务在 PR / push 时执行 `pnpm test`，作为合入门禁。
