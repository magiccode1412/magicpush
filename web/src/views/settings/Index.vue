<template>
  <div class="space-y-6 animate-fade-in">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">系统设置</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- 个人信息 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">个人信息</h3>

        <el-form
          ref="profileFormRef"
          :model="profileForm"
          :rules="profileRules"
          label-position="top"
        >
          <div class="flex flex-col items-center gap-4 mb-6">
            <el-avatar :size="64" :src="profileForm.avatar" class="flex-shrink-0">
              <User class="w-6 h-6" />
            </el-avatar>
            <el-input v-model="profileForm.avatar" placeholder="输入头像URL" class="w-full" />
          </div>

          <el-form-item label="用户名" prop="username">
            <el-input v-model="profileForm.username" placeholder="请输入用户名" />
          </el-form-item>

          <el-form-item label="邮箱">
            <el-input v-model="profileForm.email" disabled />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="profileLoading" @click="handleUpdateProfile">
              保存修改
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 修改密码 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">修改密码</h3>

        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-position="top"
        >
          <el-form-item label="当前密码" prop="oldPassword">
            <el-input
              v-model="passwordForm.oldPassword"
              type="password"
              placeholder="请输入当前密码"
              show-password
            />
          </el-form-item>

          <el-form-item label="新密码" prop="newPassword">
            <el-input
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="请输入新密码"
              show-password
            />
          </el-form-item>

          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="请确认新密码"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="passwordLoading" @click="handleChangePassword">
              修改密码
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 外观设置 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">外观设置</h3>
          
          <div class="space-y-4">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Monitor v-if="themeStore.themeMode === 'auto'" class="w-5 h-5 text-blue-500" />
                <Sun v-else-if="!themeStore.isDark" class="w-5 h-5 text-yellow-500" />
                <Moon v-else class="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">主题模式</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ themeStore.themeMode === 'auto' ? '跟随系统' : themeStore.isDark ? '深色模式' : '浅色模式' }}
                </p>
              </div>
            </div>
            
            <el-radio-group v-model="themeStore.themeMode" class="w-full !flex flex-col gap-2">
              <el-radio label="light" class="!mr-0 !w-full">
                <div class="flex items-center gap-2">
                  <Sun class="w-4 h-4" />
                  <span>浅色模式</span>
                </div>
              </el-radio>
              <el-radio label="dark" class="!mr-0 !w-full">
                <div class="flex items-center gap-2">
                  <Moon class="w-4 h-4" />
                  <span>深色模式</span>
                </div>
              </el-radio>
              <el-radio label="auto" class="!mr-0 !w-full">
                <div class="flex items-center gap-2">
                  <Monitor class="w-4 h-4" />
                  <span>跟随系统</span>
                </div>
              </el-radio>
            </el-radio-group>
          </div>
        </div>

        <!-- IPv4-to-IPv6 代理设置 -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">代理转发</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Globe class="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">IPv4-to-IPv6 转发</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">解决 IPv6-only 服务器访问问题</p>
                </div>
              </div>
              <el-switch
                v-model="settingsStore.proxyEnabled"
              />
            </div>
            
            <div v-if="settingsStore.proxyEnabled" class="mt-4">
              <el-form-item label="代理地址" class="!mb-0">
                <el-input
                  v-model="settingsStore.proxyUrl"
                  placeholder="https://your-proxy.pages.dev"
                  clearable
                />
              </el-form-item>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                填写 Cloudflare Pages 代理地址，用于转发 API 请求
              </p>
            </div>
          </div>
        </div>

        <!-- 系统管理（仅管理员可见） -->
        <div v-if="isAdmin" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">系统管理</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Shield class="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">用户注册</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">允许新用户注册</p>
                </div>
              </div>
              <el-switch
                v-model="registrationEnabled"
                :loading="registrationLoading"
                @change="handleRegistrationToggle"
              />
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ registrationEnabled ? '当前开放注册，新用户可以注册账号' : '当前已关闭注册，仅管理员可以添加用户' }}
            </p>
          </div>
        </div>

        <!-- 安全设置入口（仅管理员可见） -->
        <div v-if="isAdmin" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">安全设置</h3>
          <div class="space-y-3">
            <p class="text-sm text-gray-500 dark:text-gray-400">配置 API 请求频率限制，防止接口被滥用</p>
            <el-button type="primary" plain class="w-full !ml-0" @click="$router.push('/settings/security')">
              <Shield class="w-4 h-4 mr-1" />
              进入安全设置
            </el-button>
          </div>
        </div>

        <!-- 数据迁移 -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">数据迁移</h3>
          <div class="space-y-3">
            <p class="text-sm text-gray-500 dark:text-gray-400">导出或导入您的配置数据</p>
            <el-button type="primary" plain class="w-full !ml-0" @click="handleExport">
              <Download class="w-4 h-4 mr-1" />
              导出配置
            </el-button>
            <el-button type="success" plain class="w-full !ml-0" @click="handleImportClick">
              <Upload class="w-4 h-4 mr-1" />
              导入配置
            </el-button>
            <input
              ref="importFileRef"
              type="file"
              accept=".json"
              style="display: none"
              @change="handleFileChange"
            />
          </div>
        </div>

        <!-- 消息免打扰（全局开关） -->
        <div v-if="isAdmin" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BellOff class="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">消息免打扰</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ dndGlobalEnabled ? '已开启：各接口的免打扰配置将生效' : '已关闭：所有接口的免打扰配置不生效' }}
                </p>
              </div>
            </div>
            <el-switch
              v-model="dndGlobalEnabled"
              :loading="dndSaving"
              @change="handleDndGlobalToggle"
            />
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
            全局总开关。关闭后，即使接口配置了免打扰时间段也不会拦截推送。
            各接口的具体时间段配置请在「接口管理」页面中设置。
          </p>
        </div>
      </div>
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
import { User, Sun, Moon, Monitor, Download, Upload, Shield, Globe, BellOff } from 'lucide-vue-next'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const profileFormRef = ref(null)
const passwordFormRef = ref(null)
const importFileRef = ref(null)
const profileLoading = ref(false)
const passwordLoading = ref(false)
const registrationEnabled = ref(true)
const registrationLoading = ref(false)

// 判断是否为管理员
const isAdmin = computed(() => authStore.user?.role === 'admin')

const profileForm = reactive({
  username: '',
  email: '',
  avatar: '',
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const profileRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3-20个字符之间', trigger: 'blur' },
  ],
}

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

const loadUserInfo = async () => {
  try {
    const res = await getCurrentUser()
    if (res.success) {
      profileForm.username = res.data.username
      profileForm.email = res.data.email
      profileForm.avatar = res.data.avatar || ''
      // 更新 store 中的用户信息（包含 role）
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
      // 恢复原值
      registrationEnabled.value = !value
      ElMessage.error(res.message || '设置失败')
    }
  } catch (error) {
    // 恢复原值
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
    // 重置文件输入
    if (importFileRef.value) {
      importFileRef.value.value = ''
    }
  }
}

// 消息免打扰全局开关
const dndGlobalEnabled = ref(false)
const dndSaving = ref(false)

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
      // 恢复原值
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

onMounted(async () => {
  loadUserInfo()
  loadRegistrationSetting()
  loadDndGlobalSetting()
  // 从服务器获取版本信息
  await fetchVersionFromServer()
})
</script>
