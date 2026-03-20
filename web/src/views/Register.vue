<template>
  <div class="min-h-screen flex items-center justify-center gradient-bg-light dark:bg-gray-900 p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
          <!-- <Bell class="w-8 h-8 text-white" /> -->
          <img src="/favicon.png" alt="MagicPush" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">创建账户</h1>
        <p class="text-gray-500 dark:text-gray-400">开始您的 魔法推送 之旅</p>
      </div>

      <!-- 注册卡片 -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <!-- 检查状态中 -->
        <div v-if="checkingStatus" class="py-12 text-center">
          <el-loading />
          <p class="text-gray-500 dark:text-gray-400 mt-4">正在检查注册状态...</p>
        </div>

        <!-- 注册已关闭 -->
        <div v-else-if="!registrationEnabled" class="py-8 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Lock class="w-8 h-8 text-gray-400" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            注册已关闭
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            当前系统暂不开放注册，请联系管理员获取账号
          </p>
          <router-link to="/login">
            <el-button type="primary" size="large" class="w-full">
              返回登录
            </el-button>
          </router-link>
        </div>

        <!-- 注册表单 -->
        <template v-else>
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            @keyup.enter="handleRegister"
          >
            <el-form-item prop="username">
              <el-input
                v-model="form.username"
                placeholder="请输入用户名"
                size="large"
                :prefix-icon="User"
              />
            </el-form-item>

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

            <el-form-item prop="confirmPassword">
              <el-input
                v-model="form.confirmPassword"
                type="password"
                placeholder="请确认密码"
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
                @click="handleRegister"
              >
                注册
              </el-button>
            </el-form-item>
          </el-form>

          <!-- 分割线 -->
          <div class="flex items-center gap-4 my-6">
            <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
            <span class="text-sm text-gray-400">已有账户？</span>
            <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
          </div>

          <!-- 登录按钮 -->
          <router-link to="/login">
            <el-button size="large" class="w-full">
              返回登录
            </el-button>
          </router-link>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { checkRegistrationStatus } from '@/api/auth'
import { Bell, User, MessageCircle, Lock } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)
const loading = ref(false)
const registrationEnabled = ref(true)
const checkingStatus = ref(true)

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

// 检查注册状态
const checkStatus = async () => {
  checkingStatus.value = true
  try {
    const res = await checkRegistrationStatus()
    if (res.success) {
      registrationEnabled.value = res.data.enabled
    }
  } catch (error) {
    console.error('检查注册状态失败:', error)
    // 默认允许注册
    registrationEnabled.value = true
  } finally {
    checkingStatus.value = false
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3-20个字符之间', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

const handleRegister = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await authStore.registerUser({
      username: form.username,
      email: form.email,
      password: form.password,
    })
    if (res.success) {
      ElMessage.success('注册成功')
      router.push('/')
    } else {
      ElMessage.error(res.message || '注册失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '注册失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  checkStatus()
})
</script>
