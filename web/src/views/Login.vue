<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-primary);">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-10 fade-in">
        <div class="w-20 h-20 mx-auto rounded-2xl glass-card flex items-center justify-center mb-6" style="box-shadow: var(--shadow-glow);">
          <img src="/favicon.png" alt="MagicPush" class="w-12 h-12">
        </div>
        <h1 class="font-display text-4xl font-bold text-primary mb-3">MagicPush</h1>
        <p class="text-secondary text-sm">聚合消息推送平台 · 让推送更简单</p>
      </div>

      <!-- 登录卡片 - 液态玻璃效果 -->
      <div class="glass-card p-8 fade-in delay-200">
        <template v-if="checkingStatus">
          <div class="py-12 text-center">
            <el-loading />
            <p class="text-secondary mt-4">正在检查系统状态...</p>
          </div>
        </template>

        <template v-else-if="!hasAdminUser">
          <div class="py-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
              </svg>
            </div>
            <h3 class="font-display text-lg font-semibold text-primary mb-2">
              欢迎使用 MagicPush
            </h3>
            <p class="text-secondary text-sm mb-6">
              系统尚未初始化，请注册首个管理员账户
            </p>
            <router-link to="/register">
              <el-button type="primary" size="large" class="w-full">
                开始初始化
              </el-button>
            </router-link>
          </div>
        </template>

        <template v-else>
          <h2 class="font-display text-2xl font-semibold text-primary mb-2">欢迎回来</h2>
          <p class="text-secondary text-sm mb-8">请登录您的账户继续</p>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            @keyup.enter="handleLogin"
          >
            <div class="mb-5">
              <label class="block text-sm text-secondary mb-2">邮箱地址</label>
              <el-input
                v-model="form.email"
                placeholder="admin@magicpush.io"
                size="large"
                class="custom-input"
              />
            </div>

            <div class="mb-5">
              <label class="block text-sm text-secondary mb-2">密码</label>
              <el-input
                v-model="form.password"
                type="password"
                placeholder="••••••••••"
                size="large"
                show-password
                class="custom-input"
              />
            </div>

            <div class="flex items-center justify-between text-sm mb-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked class="w-4 h-4 rounded" style="background: var(--bg-glass); border: 1px solid var(--border-default);">
                <span class="text-secondary">记住我</span>
              </label>
              <a href="#" class="text-accent hover:underline" style="color: var(--accent-primary);">忘记密码？</a>
            </div>

            <el-button
              type="primary"
              size="large"
              class="w-full btn-primary"
              :loading="loading"
              @click="handleLogin"
            >
              登 录
            </el-button>
          </el-form>

          <div class="flex items-center gap-4 my-8">
            <div class="flex-1 h-px" style="background: var(--border-default);"></div>
            <span class="text-muted text-sm">或</span>
            <div class="flex-1 h-px" style="background: var(--border-default);"></div>
          </div>

          <router-link to="/register" v-if="registrationEnabled">
            <el-button size="large" class="w-full btn-secondary">
              创建新账户
            </el-button>
          </router-link>
          <p v-else class="text-center text-sm text-muted mt-4">
            当前系统暂不开放注册
          </p>
        </template>
      </div>

      <p class="text-center text-xs text-muted mt-8 fade-in delay-300">
        支持 10+ 消息渠道：企业微信 · Telegram · 飞书 · 钉钉 · 微信公众号 · WxPusher · PushPlus · Server酱
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

const checkSystemStatus = async () => {
  checkingStatus.value = true
  try {
    const res = await checkHealth()
    if (res) {
      hasAdminUser.value = res.system?.hasAdminUser ?? true
      registrationEnabled.value = res.system?.registrationEnabled ?? true

      if (!hasAdminUser.value) {
        router.replace('/register')
        return
      }
    }
  } catch (error) {
    console.error('检查系统状态失败:', error)
    hasAdminUser.value = true
    registrationEnabled.value = true
  } finally {
    checkingStatus.value = false
  }
}

onMounted(async () => {
  await checkSystemStatus()

  if (import.meta.env.DEV && hasAdminUser.value) {
    form.email = 'admin@example.com'
    form.password = 'admin123'
  }
})

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
