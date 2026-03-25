<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-primary);">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-10 fade-in">
        <div class="w-20 h-20 mx-auto rounded-2xl glass-card flex items-center justify-center mb-6" style="box-shadow: var(--shadow-glow);">
          <img src="/favicon.png" alt="MagicPush" class="w-12 h-12">
        </div>
        <h1 class="font-display text-4xl font-bold text-primary mb-3">MagicPush</h1>
        <p class="text-secondary text-sm">开始您的推送之旅</p>
      </div>

      <!-- 注册卡片 - 液态玻璃效果 -->
      <div class="glass-card p-8 fade-in delay-200">
        <template v-if="checkingStatus">
          <div class="py-12 text-center">
            <el-loading />
            <p class="text-secondary mt-4">正在检查注册状态...</p>
          </div>
        </template>

        <template v-else-if="!registrationEnabled">
          <div class="py-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full glass-card flex items-center justify-center">
              <svg class="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
              </svg>
            </div>
            <h3 class="font-display text-lg font-semibold text-primary mb-2">
              注册已关闭
            </h3>
            <p class="text-secondary text-sm mb-6">
              当前系统暂不开放注册，请联系管理员获取账号
            </p>
            <router-link to="/login">
              <el-button type="primary" size="large" class="w-full">
                返回登录
              </el-button>
            </router-link>
          </div>
        </template>

        <template v-else>
          <h2 class="font-display text-2xl font-semibold text-primary mb-2">创建账户</h2>
          <p class="text-secondary text-sm mb-8">开始您的 MagicPush 之旅</p>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            @keyup.enter="handleRegister"
          >
            <div class="mb-5">
              <label class="block text-sm text-secondary mb-2">用户名</label>
              <el-input
                v-model="form.username"
                placeholder="请输入用户名"
                size="large"
                class="custom-input"
              />
            </div>

            <div class="mb-5">
              <label class="block text-sm text-secondary mb-2">邮箱地址</label>
              <el-input
                v-model="form.email"
                placeholder="请输入邮箱"
                size="large"
                class="custom-input"
              />
            </div>

            <div class="mb-5">
              <label class="block text-sm text-secondary mb-2">密码</label>
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                show-password
                class="custom-input"
              />
            </div>

            <div class="mb-6">
              <label class="block text-sm text-secondary mb-2">确认密码</label>
              <el-input
                v-model="form.confirmPassword"
                type="password"
                placeholder="请确认密码"
                size="large"
                show-password
                class="custom-input"
              />
            </div>

            <el-button
              type="primary"
              size="large"
              class="w-full btn-primary"
              :loading="loading"
              @click="handleRegister"
            >
              注 册
            </el-button>
          </el-form>

          <div class="flex items-center gap-4 my-8">
            <div class="flex-1 h-px" style="background: var(--border-default);"></div>
            <span class="text-muted text-sm">已有账户？</span>
            <div class="flex-1 h-px" style="background: var(--border-default);"></div>
          </div>

          <router-link to="/login">
            <el-button size="large" class="w-full btn-secondary">
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

const checkStatus = async () => {
  checkingStatus.value = true
  try {
    const res = await checkRegistrationStatus()
    if (res.success) {
      registrationEnabled.value = res.data.enabled
    }
  } catch (error) {
    console.error('检查注册状态失败:', error)
    registrationEnabled.value = true
  } finally {
    checkingStatus.value = false
  }
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

<style scoped>
.custom-input :deep(.el-input__wrapper) {
  background: var(--bg-glass);
  border: 1px solid var(--border-default);
  box-shadow: none;
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
}

.custom-input :deep(.el-input__inner) {
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.custom-input :deep(.el-input__inner::placeholder) {
  color: var(--text-muted);
}

.custom-input :deep(.el-input__wrapper:hover) {
  border-color: var(--border-hover);
}

.custom-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-bg) !important;
}
</style>
