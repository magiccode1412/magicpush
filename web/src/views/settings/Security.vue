<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">安全设置</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          配置 API 请求频率限制，防止滥用
        </p>
      </div>
      <el-button type="warning" plain @click="handleReset">
        <RefreshCw class="w-4 h-4 mr-1" />
        重置为默认值
      </el-button>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">限流配置</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        每个配置项表示对应接口每分钟允许的最大请求次数，修改后立即生效
      </p>

      <el-form label-position="top" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="item in configItems" :key="item.key">
            <el-form-item>
              <template #label>
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-md flex items-center justify-center" :class="item.bgColor">
                    <component :is="item.icon" class="w-3.5 h-3.5" :class="item.iconColor" />
                  </div>
                  <span class="text-sm font-medium">{{ item.label }}</span>
                </div>
              </template>
              <el-input-number
                v-model="config[item.key]"
                :min="bounds[item.key]?.min || 1"
                :max="bounds[item.key]?.max || 1000"
                class="w-full"
                controls-position="right"
              />
              <p class="text-xs text-gray-400 mt-1">
                范围: {{ bounds[item.key]?.min }} ~ {{ bounds[item.key]?.max }}，
                默认: {{ defaults[item.key] }}
              </p>
            </el-form-item>
          </div>
        </div>
      </el-form>

      <div class="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <el-button type="primary" :loading="saving" @click="handleSave">
          <Save class="w-4 h-4 mr-1" />
          保存配置
        </el-button>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">说明</h3>
      <div class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
        <p><strong>全局限流</strong>：每个 IP 每分钟允许访问 API 的总次数上限</p>
        <p><strong>登录/注册</strong>：限制每个 IP 每分钟的尝试次数，防止暴力破解和恶意注册</p>
        <p><strong>推送接口 (IP)</strong>：按来源 IP 限制推送频率</p>
        <p><strong>推送接口 (Token)</strong>：按推送令牌限制频率，防止 Token 泄露后被滥用</p>
        <p><strong>入站接口</strong>：按 Webhook Token 限制入站请求频率</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRateLimitConfig, updateRateLimitConfig, resetRateLimitConfig } from '@/api/admin'
import { RefreshCw, Save, Globe, Lock, UserPlus, Key, Activity, Send, ArrowDownRight } from 'lucide-vue-next'

const config = ref({})
const defaults = ref({})
const bounds = ref({})
const saving = ref(false)

const configItems = [
  { key: 'rate_limit_global_max', label: '全局限流', icon: Globe, bgColor: 'bg-gray-100 dark:bg-gray-700', iconColor: 'text-gray-600 dark:text-gray-300' },
  { key: 'rate_limit_login_max', label: '登录接口', icon: Lock, bgColor: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  { key: 'rate_limit_register_max', label: '注册接口', icon: UserPlus, bgColor: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
  { key: 'rate_limit_refresh_max', label: 'Token 刷新', icon: Key, bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400' },
  { key: 'rate_limit_health_max', label: '健康检查', icon: Activity, bgColor: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  { key: 'rate_limit_push_ip_max', label: '推送接口 (IP)', icon: Send, bgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { key: 'rate_limit_push_token_max', label: '推送接口 (Token)', icon: Send, bgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { key: 'rate_limit_inbound_max', label: '入站接口', icon: ArrowDownRight, bgColor: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
]

const loadConfig = async () => {
  try {
    const res = await getRateLimitConfig()
    if (res.success) {
      config.value = res.data.config
      defaults.value = res.data.defaults
      bounds.value = res.data.bounds
    }
  } catch (error) {
    ElMessage.error('加载配置失败')
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = await updateRateLimitConfig(config.value)
    if (res.success) {
      ElMessage.success('配置保存成功，已立即生效')
    }
  } catch (error) {
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

const handleReset = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要将所有限流配置重置为默认值吗？',
      '确认重置',
      { type: 'warning' }
    )
    const res = await resetRateLimitConfig()
    if (res.success) {
      config.value = res.data
      ElMessage.success('已重置为默认值')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重置失败')
    }
  }
}

onMounted(() => {
  loadConfig()
})
</script>
