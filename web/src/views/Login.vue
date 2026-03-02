<template>
  <div class="min-h-screen flex items-center justify-center gradient-bg-light dark:bg-gray-900 p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
          <Bell class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">MagicPush</h1>
        <p class="text-gray-500 dark:text-gray-400">欢迎回来，请登录您的账户</p>
      </div>

      <!-- 登录卡片 -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <!-- 检查状态中 -->
        <div v-if="checkingStatus" class="py-12 text-center">
          <el-loading />
          <p class="text-gray-500 dark:text-gray-400 mt-4">正在检查系统状态...</p>
        </div>

        <!-- 首次安装引导 -->
        <div v-else-if="!hasAdminUser" class="py-8 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <Sparkles class="w-8 h-8 text-white" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            欢迎使用 MagicPush
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            系统尚未初始化，请注册首个管理员账户
          </p>
          <router-link to="/register">
            <el-button type="primary" size="large" class="w-full">
              开始初始化
            </el-button>
          </router-link>
        </div>

        <!-- 登录表单 -->
        <template v-else>
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          @keyup.enter="handleLogin"
        >
          <el-form-item prop="email">
            <el-input
              v-model="form.email"
              placeholder="请输入邮箱"
              size="large"
              :prefix-icon="MessageCircle"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              show-password
              :prefix-icon="Lock"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              class="w-full"
              :loading="loading"
              @click="handleLogin"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

          <!-- 分割线 -->
          <div class="flex items-center gap-4 my-6">
            <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
            <span class="text-sm text-gray-400">还没有账户？</span>
            <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
          </div>

          <!-- 注册按钮 -->
          <router-link to="/register" v-if="registrationEnabled">
            <el-button size="large" class="w-full">
              注册新账户
            </el-button>
          </router-link>
          <p v-else class="text-center text-sm text-gray-400 mt-4">
            当前系统暂不开放注册
          </p>
        </template>
      </div>

      <!-- 页脚 -->
      <p class="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
        支持多种消息渠道推送 · 企业微信 · 钉钉 · Telegram
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { checkHealth } from '@/api/auth'
import { Bell, MessageCircle, Lock, Sparkles } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)
const loading = ref(false)
const checkingStatus = ref(true)
const hasAdminUser = ref(true)
const registrationEnabled = ref(true)

const form = reactive({
  email: '',
  password: '',
})

// 检查系统状态
const checkSystemStatus = async () => {
  checkingStatus.value = true
  try {
    const res = await checkHealth()
    if (res.data) {
      hasAdminUser.value = res.data.system?.hasAdminUser ?? true
      registrationEnabled.value = res.data.system?.registrationEnabled ?? true
    }
  } catch (error) {
    console.error('检查系统状态失败:', error)
    // 默认允许登录
    hasAdminUser.value = true
    registrationEnabled.value = true
  } finally {
    checkingStatus.value = false
  }
}

// 开发模式下自动填充默认账号
onMounted(async () => {
  await checkSystemStatus()

  if (import.meta.env.DEV && hasAdminUser.value) {
    form.email = 'admin@example.com'
    form.password = 'admin123'
  }
})

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' },
  ],
}

const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await authStore.loginUser(form)
    if (res.success) {
      ElMessage.success('登录成功')
      router.push('/')
    } else {
      ElMessage.error(res.message || '登录失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>
