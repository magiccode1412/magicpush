<template>
  <div class="space-y-6 animate-fade-in">
    <h2 class="text-[22px] font-semibold text-gray-900 dark:text-white">系统设置</h2>

    <!-- 账户设置分组 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">账户设置</span>
      </div>

      <!-- 个人信息 -->
      <div class="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0" @click="showProfileDialog = true">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <User class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">个人信息</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ profileForm.username || '未设置' }}</p>
          </div>
        </div>
        <ChevronRight class="w-5 h-5 text-gray-400" />
      </div>

      <!-- 修改密码 -->
      <div class="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700" @click="showPasswordDialog = true">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm">
            <Lock class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">修改密码</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">更改登录密码</p>
          </div>
        </div>
        <ChevronRight class="w-5 h-5 text-gray-400" />
      </div>

      <!-- 消息免打扰 (管理员) -->
      <div v-if="isAdmin" class="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm">
            <BellOff class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">消息免打扰</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ dndGlobalEnabled ? '已开启：各接口的免打扰配置将生效' : '已关闭：所有接口的免打扰配置不生效' }}
            </p>
          </div>
        </div>
        <el-switch v-model="dndGlobalEnabled" :loading="dndSaving" @change="handleDndGlobalToggle" />
      </div>
    </div>

    <!-- 外观与主题分组 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">外观与主题</span>
      </div>

      <!-- 主题模式 -->
      <div class="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700" @click="showThemeDialog = true">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Sun v-if="themeStore.themeMode === 'light'" class="w-5 h-5 text-white" />
            <Moon v-else-if="themeStore.themeMode === 'dark'" class="w-5 h-5 text-white" />
            <Monitor v-else class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">主题模式</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ themeStore.themeMode === 'auto' ? '跟随系统' : themeStore.isDark ? '深色模式' : '浅色模式' }}
            </p>
          </div>
        </div>
        <ChevronRight class="w-5 h-5 text-gray-400" />
      </div>

      <!-- IPv4-to-IPv6 代理转发 -->
      <div class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
              <Globe class="w-5 h-5 text-white" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">IPv4-to-IPv6 转发</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">解决 IPv6-only 服务器访问问题</p>
            </div>
          </div>
          <el-switch v-model="settingsStore.proxyEnabled" />
        </div>
        <!-- 代理地址配置子行 -->
        <div v-if="settingsStore.proxyEnabled" class="flex items-center justify-between px-5 py-3 pl-[52px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" @click="showProxyDialog = true">
          <div>
            <p class="text-sm text-gray-700 dark:text-gray-300">代理地址</p>
            <p class="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{{ settingsStore.proxyUrl || '点击配置' }}</p>
          </div>
          <ChevronRight class="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>

    <!-- 系统设置分组 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">系统设置</span>
      </div>

      <!-- 版本更新检测 -->
      <div class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm">
              <RefreshCw class="w-5 h-5 text-white" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">自动检测更新</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">启动时静默检查是否有新版本</p>
            </div>
          </div>
          <el-switch v-model="settingsStore.checkUpdateEnabled" />
        </div>
        <!-- 包含 dev 分支子行 -->
        <div v-if="settingsStore.checkUpdateEnabled" class="flex items-center justify-between px-5 py-3 pl-[52px] border-b border-gray-100 dark:border-gray-700">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">包含 dev 分支</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">同时检测开发分支的预发布版本</p>
          </div>
          <el-switch v-model="settingsStore.checkUpdateDevEnabled" />
        </div>
        <!-- 提示文字 -->
        <div v-if="settingsStore.checkUpdateEnabled" class="px-5 pb-3 pl-[52px]">
          <p class="text-xs text-gray-400 dark:text-gray-500">
            {{ settingsStore.checkUpdateDevEnabled ? 'dev 分支为开发中的预发布版本，可能不稳定' : '关闭后将不再自动检查远程版本更新，仍可通过底部版本号手动触发' }}
          </p>
        </div>
      </div>

      <!-- 用户注册开关 (管理员) -->
      <div v-if="isAdmin" class="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-sm">
            <Shield class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">用户注册</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ registrationEnabled ? '当前开放注册，新用户可以注册账号' : '当前已关闭注册，仅管理员可以添加用户' }}
            </p>
          </div>
        </div>
        <el-switch v-model="registrationEnabled" :loading="registrationLoading" @change="handleRegistrationToggle" />
      </div>

      <!-- 安全设置入口 (管理员) -->
      <div v-if="isAdmin" class="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700" @click="$router.push('/settings/security')">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <ShieldCheck class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">安全设置</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">配置 API 请求频率限制，防止接口被滥用</p>
          </div>
        </div>
        <ChevronRight class="w-5 h-5 text-gray-400" />
      </div>

      <!-- 数据迁移 -->
      <div class="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200" @click="showDataMigrateDialog = true">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center shadow-sm">
            <Database class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">数据迁移</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">导出或导入您的配置数据</p>
          </div>
        </div>
        <ChevronRight class="w-5 h-5 text-gray-400" />
      </div>
    </div>

    <!-- ==================== 弹窗组件 ==================== -->

    <!-- 个人信息编辑弹窗 -->
    <el-dialog v-model="showProfileDialog" title="个人信息" width="480px" :close-on-click-modal="false" destroy-on-close>
      <template #header>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <User class="w-4 h-4 text-white" />
          </div>
          <span class="text-lg font-semibold text-gray-900 dark:text-white">个人信息</span>
        </div>
      </template>
      <el-form ref="profileFormRef" :model="profileForm" :rules="profileRules" label-position="top">
        <div class="flex flex-col items-center gap-4 mb-6">
          <el-avatar :size="80" :src="profileForm.avatar" class="flex-shrink-0 ring-4 ring-blue-100 dark:ring-blue-900/30">
            <User class="w-8 h-8" />
          </el-avatar>
          <el-input v-model="profileForm.avatar" placeholder="输入头像URL" class="w-full max-w-[280px]" />
        </div>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="profileForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="profileForm.email" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showProfileDialog = false">取消</el-button>
        <el-button type="primary" :loading="profileLoading" @click="handleUpdateProfile">保存修改</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="showPasswordDialog" title="修改密码" width="480px" :close-on-click-modal="false" destroy-on-close>
      <template #header>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
            <Lock class="w-4 h-4 text-white" />
          </div>
          <span class="text-lg font-semibold text-gray-900 dark:text-white">修改密码</span>
        </div>
      </template>
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-position="top">
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入当前密码" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请确认新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasswordDialog = false">取消</el-button>
        <el-button type="primary" :loading="passwordLoading" @click="handleChangePassword">修改密码</el-button>
      </template>
    </el-dialog>

    <!-- 主题选择弹窗 -->
    <el-dialog v-model="showThemeDialog" title="主题模式" width="480px" :close-on-click-modal="false">
      <template #header>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Palette class="w-4 h-4 text-white" />
          </div>
          <span class="text-lg font-semibold text-gray-900 dark:text-white">主题模式</span>
        </div>
      </template>
      <div class="grid grid-cols-3 gap-4 p-2">
        <!-- 浅色模式 -->
        <div
          class="relative cursor-pointer rounded-xl border-2 p-6 flex flex-col items-center gap-3 transition-all duration-200"
          :class="themeStore.themeMode === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'"
          @click="themeStore.themeMode = 'light'"
        >
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center shadow-lg">
            <Sun class="w-8 h-8 text-white" />
          </div>
          <span class="text-sm font-medium text-gray-900 dark:text-white">浅色模式</span>
          <Check v-if="themeStore.themeMode === 'light'" class="absolute top-2 right-2 w-5 h-5 text-blue-500" />
        </div>
        <!-- 深色模式 -->
        <div
          class="relative cursor-pointer rounded-xl border-2 p-6 flex flex-col items-center gap-3 transition-all duration-200"
          :class="themeStore.themeMode === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'"
          @click="themeStore.themeMode = 'dark'"
        >
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Moon class="w-8 h-8 text-white" />
          </div>
          <span class="text-sm font-medium text-gray-900 dark:text-white">深色模式</span>
          <Check v-if="themeStore.themeMode === 'dark'" class="absolute top-2 right-2 w-5 h-5 text-blue-500" />
        </div>
        <!-- 跟随系统 -->
        <div
          class="relative cursor-pointer rounded-xl border-2 p-6 flex flex-col items-center gap-3 transition-all duration-200"
          :class="themeStore.themeMode === 'auto' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'"
          @click="themeStore.themeMode = 'auto'"
        >
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center shadow-lg">
            <Monitor class="w-8 h-8 text-white" />
          </div>
          <span class="text-sm font-medium text-gray-900 dark:text-white">跟随系统</span>
          <Check v-if="themeStore.themeMode === 'auto'" class="absolute top-2 right-2 w-5 h-5 text-blue-500" />
        </div>
      </div>
    </el-dialog>

    <!-- 代理配置弹窗 -->
    <el-dialog v-model="showProxyDialog" title="代理配置" width="480px" :close-on-click-modal="false">
      <template #header>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Globe class="w-4 h-4 text-white" />
          </div>
          <span class="text-lg font-semibold text-gray-900 dark:text-white">代理配置</span>
        </div>
      </template>
      <div class="space-y-4">
        <el-form-item label="代理地址" class="!mb-0">
          <el-input v-model="settingsStore.proxyUrl" placeholder="https://your-proxy.pages.dev" clearable size="large" />
        </el-form-item>
        <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
          <p class="text-sm font-medium text-blue-700 dark:text-blue-300">使用说明</p>
          <ul class="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
            <li>填写 Cloudflare Pages 代理地址</li>
            <li>用于转发 API 请求到 IPv4 网络</li>
            <li>配置后自动生效，无需重启</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button @click="showProxyDialog = false">完成</el-button>
      </template>
    </el-dialog>

    <!-- 数据迁移弹窗 -->
    <el-dialog v-model="showDataMigrateDialog" title="数据迁移" width="480px" :close-on-click-modal="false">
      <template #header>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
            <Database class="w-4 h-4 text-white" />
          </div>
          <span class="text-lg font-semibold text-gray-900 dark:text-white">数据迁移</span>
        </div>
      </template>
      <div class="space-y-4">
        <button
          class="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
          @click="handleExport"
        >
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
            <Download class="w-6 h-6 text-white" />
          </div>
          <div class="text-left">
            <p class="text-base font-medium text-gray-900 dark:text-white">导出配置</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">将当前配置导出为 JSON 文件</p>
          </div>
        </button>
        <button
          class="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
          @click="handleImportClick"
        >
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
            <Upload class="w-6 h-6 text-white" />
          </div>
          <div class="text-left">
            <p class="text-base font-medium text-gray-900 dark:text-white">导入配置</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">从 JSON 文件恢复配置数据</p>
          </div>
        </button>
        <input ref="importFileRef" type="file" accept=".json" style="display: none" @change="handleFileChange" />
      </div>
      <template #footer>
        <el-button @click="showDataMigrateDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useSettingsStore } from '@/stores/settings'
import { getCurrentUser, updateCurrentUser, changePassword, exportConfig, importConfig, getRegistrationSetting, updateRegistrationSetting, getDndGlobalSetting, updateDndGlobalSetting } from '@/api/user'
import { fetchVersionFromServer } from '@/utils/version'
import {
  User,
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
  Shield,
  Globe,
  BellOff,
  RefreshCw,
  Lock,
  ChevronRight,
  Check,
  Database,
  Palette,
  ShieldCheck,
} from 'lucide-vue-next'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

// 表单引用
const profileFormRef = ref(null)
const passwordFormRef = ref(null)
const importFileRef = ref(null)

// 加载状态
const profileLoading = ref(false)
const passwordLoading = ref(false)
const registrationLoading = ref(false)

// 管理员权限判断
const isAdmin = computed(() => authStore.user?.role === 'admin')

// ========== 弹窗显示状态 ==========
const showProfileDialog = ref(false)
const showPasswordDialog = ref(false)
const showThemeDialog = ref(false)
const showProxyDialog = ref(false)
const showDataMigrateDialog = ref(false)

// ========== 个人信息表单 ==========
const profileForm = reactive({
  username: '',
  email: '',
  avatar: '',
})

const profileRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3-20个字符之间', trigger: 'blur' },
  ],
}

// ========== 修改密码表单 ==========
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

// ========== 用户注册设置 ==========
const registrationEnabled = ref(true)

// ========== 消息免打扰全局开关 ==========
const dndGlobalEnabled = ref(false)
const dndSaving = ref(false)

// ========== 数据加载函数 ==========
const loadUserInfo = async () => {
  try {
    const res = await getCurrentUser()
    if (res.success) {
      profileForm.username = res.data.username
      profileForm.email = res.data.email
      profileForm.avatar = res.data.avatar || ''
      authStore.user = { ...authStore.user, ...res.data }
      localStorage.setItem('user', JSON.stringify(authStore.user))
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

const loadRegistrationSetting = async () => {
  if (!isAdmin.value) return
  try {
    const res = await getRegistrationSetting()
    if (res.success) {
      registrationEnabled.value = res.data.enabled
    }
  } catch (error) {
    console.error('加载注册设置失败:', error)
  }
}

const loadDndGlobalSetting = async () => {
  if (!isAdmin.value) return
  try {
    const res = await getDndGlobalSetting()
    if (res.success) {
      dndGlobalEnabled.value = res.data.enabled
    }
  } catch (error) {
    console.error('加载免打扰全局设置失败:', error)
  }
}

// ========== 事件处理函数 ==========
const handleRegistrationToggle = async (value) => {
  if (!isAdmin.value) {
    ElMessage.error('需要管理员权限')
    return
  }
  registrationLoading.value = true
  try {
    const res = await updateRegistrationSetting(value)
    if (res.success) {
      ElMessage.success(value ? '已开启用户注册' : '已关闭用户注册')
    } else {
      registrationEnabled.value = !value
      ElMessage.error(res.message || '设置失败')
    }
  } catch (error) {
    registrationEnabled.value = !value
    ElMessage.error('设置失败')
  } finally {
    registrationLoading.value = false
  }
}

const handleUpdateProfile = async () => {
  const valid = await profileFormRef.value?.validate().catch(() => false)
  if (!valid) return

  profileLoading.value = true
  try {
    const res = await updateCurrentUser({
      username: profileForm.username,
      avatar: profileForm.avatar,
    })
    if (res.success) {
      ElMessage.success('个人信息更新成功')
      authStore.user.username = profileForm.username
      localStorage.setItem('user', JSON.stringify(authStore.user))
      showProfileDialog.value = false
    }
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  } finally {
    profileLoading.value = false
  }
}

const handleChangePassword = async () => {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  passwordLoading.value = true
  try {
    const res = await changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })
    if (res.success) {
      ElMessage.success('密码修改成功')
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
      showPasswordDialog.value = false
    }
  } catch (error) {
    ElMessage.error(error.message || '修改失败')
  } finally {
    passwordLoading.value = false
  }
}

const handleExport = async () => {
  try {
    const res = await exportConfig()
    if (res.success) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `push-config-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      ElMessage.success('配置导出成功')
    } else {
      ElMessage.error(res.message || '导出失败')
    }
  } catch (error) {
    console.error('导出配置失败:', error)
    ElMessage.error('导出配置失败')
  }
}

const handleImportClick = () => {
  importFileRef.value?.click()
}

const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  try {
    const content = await file.text()
    const data = JSON.parse(content)

    await ElMessageBox.confirm(
      '导入配置将创建新的渠道和接口（已存在的同名配置会被跳过）。确定要继续吗？',
      '确认导入',
      {
        confirmButtonText: '确定导入',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const res = await importConfig(data)
    if (res.success) {
      ElMessage.success(
        `导入成功：创建 ${res.data.channels.created} 个渠道、${res.data.endpoints.created} 个接口`
      )
    } else {
      ElMessage.error(res.message || '导入失败')
    }
  } catch (error) {
    if (error === 'cancel') return
    if (error instanceof SyntaxError) {
      ElMessage.error('JSON 文件格式错误')
    } else {
      console.error('导入配置失败:', error)
      ElMessage.error('导入配置失败')
    }
  } finally {
    if (importFileRef.value) {
      importFileRef.value.value = ''
    }
  }
}

const handleDndGlobalToggle = async (value) => {
  if (!isAdmin.value) {
    ElMessage.error('需要管理员权限')
    return
  }
  dndSaving.value = true
  try {
    const res = await updateDndGlobalSetting(value)
    if (res.success) {
      ElMessage.success(value ? '已开启全局免打扰' : '已关闭全局免打扰')
    } else {
      dndGlobalEnabled.value = !value
      ElMessage.error(res.message || '设置失败')
    }
  } catch (error) {
    dndGlobalEnabled.value = !value
    ElMessage.error('设置失败')
  } finally {
    dndSaving.value = false
  }
}

// ========== 生命周期 ==========
onMounted(async () => {
  loadUserInfo()
  loadRegistrationSetting()
  loadDndGlobalSetting()
  await fetchVersionFromServer()
})
</script>
