<template>
  <el-dialog
    :model-value="visible"
    :title="mode === 'rebind' ? '重新绑定小爱音箱' : '绑定小爱音箱'"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="step !== 'success'"
    :show-close="step !== 'polling'"
    @close="handleClose"
  >
    <!-- 步骤 1: 选择登录方式 -->
    <div v-if="step === 'select'" class="space-y-4">
      <!-- 已有账号列表 -->
      <div v-if="existingAccounts.length > 0">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">选择已登录的小米账号</p>
        <div class="space-y-2 mb-4">
          <div
            v-for="account in existingAccounts"
            :key="account.userId"
            class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
            :class="{ 'border-blue-500 bg-blue-50 dark:bg-blue-900/20': selectedAccount?.userId === account.userId }"
            @click="selectedAccount = account"
          >
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                小米账号 ({{ account.userId }})
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                已绑定 {{ account.channelCount }} 个设备
              </p>
            </div>
            <el-icon v-if="selectedAccount?.userId === account.userId" class="text-blue-500 text-xl">
              <CircleCheck />
            </el-icon>
          </div>
        </div>
        <el-divider>或</el-divider>
      </div>

      <!-- 扫码登录新账号 -->
      <el-button type="primary" class="w-full" @click="startQRLogin">
        扫码登录新的小米账号
      </el-button>
    </div>

    <!-- 步骤 2: 获取二维码 -->
    <div v-else-if="step === 'loading'" class="text-center py-12">
      <el-icon class="is-loading text-3xl text-gray-400"><Loading /></el-icon>
      <p class="text-sm text-gray-400 mt-3">正在获取登录二维码...</p>
    </div>

    <!-- 步骤 3: 展示二维码，等待扫码 -->
    <div v-else-if="step === 'qrcode' || step === 'polling'" class="text-center">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        请使用<strong>小米手机/米家APP</strong>扫描下方二维码登录小米账号
      </p>

      <!-- 二维码 -->
      <div class="inline-block p-3 bg-white rounded-lg border border-gray-200">
        <QrcodeVue :value="qrCodeUrl" :size="220" level="M" />
      </div>

      <!-- 备选：手动打开链接 -->
      <div class="mt-3">
        <p class="text-xs text-gray-400">
          无法扫码？
          <a
            :href="loginUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-blue-500 hover:text-blue-700 underline"
          >点击此处打开链接手动登录</a>
        </p>
      </div>

      <!-- 状态提示 -->
      <div class="mt-4">
        <div v-if="step === 'polling'" class="flex items-center justify-center gap-2 text-sm text-gray-500">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>等待扫码中，请在小米手机上确认登录...</span>
        </div>
        <p v-if="step === 'qrcode'" class="text-sm text-amber-600">
          二维码有效期约 5 分钟
        </p>
      </div>

      <!-- 返回按钮 -->
      <div v-if="existingAccounts.length > 0" class="mt-4">
        <el-button text @click="step = 'select'">
          <el-icon class="mr-1"><ArrowLeft /></el-icon>
          返回选择账号
        </el-button>
      </div>
    </div>

    <!-- 步骤 4: 配置设备信息 -->
    <div v-else-if="step === 'config'" class="space-y-4">
      <!-- 登录成功提示 -->
      <div v-if="!selectedAccount" class="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg mb-4">
        <el-icon class="text-green-600"><SuccessFilled /></el-icon>
        <span class="text-sm text-green-700 dark:text-green-300">小米账号登录成功</span>
      </div>

      <!-- 配置表单 -->
      <el-form label-position="top">
        <el-form-item label="设备名称" required>
          <el-input
            v-model="deviceName"
            placeholder="请输入设备名称，如：客厅小爱"
            maxlength="50"
          />
          <p class="text-xs text-gray-500 mt-1">
            设备名称必须与米家 App 中的名称完全一致（注意大小写、空格）
          </p>
        </el-form-item>

        <el-form-item label="渠道名称">
          <el-input
            v-model="channelName"
            placeholder="小爱音箱"
            maxlength="50"
          />
        </el-form-item>

        <el-form-item label="TTS 模式">
          <el-select v-model="ttsMode" class="w-full">
            <el-option label="自动（推荐）" value="auto" />
            <el-option label="指令模式" value="command" />
            <el-option label="默认链路" value="default" />
          </el-select>
          <p class="text-xs text-gray-500 mt-1">
            auto=智能选择最优方式；command=仅用MiOT指令；default=仅用MiNA默认链路
          </p>
        </el-form-item>
      </el-form>
    </div>

    <!-- 步骤 5: 绑定成功 -->
    <div v-else-if="step === 'success'" class="text-center py-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
        <el-icon class="text-3xl text-green-600 dark:text-green-400"><SuccessFilled /></el-icon>
      </div>
      <p class="text-lg font-medium text-green-700 dark:text-green-400 mb-2">绑定成功</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        已绑定到「{{ boundDeviceName }}」
      </p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="step === 'error'" class="text-center py-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <el-icon class="text-3xl text-red-600 dark:text-red-400"><WarningFilled /></el-icon>
      </div>
      <p class="text-lg font-medium text-red-700 dark:text-red-400 mb-2">操作失败</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ errorMsg }}</p>
      <el-button type="primary" @click="reset">重新开始</el-button>
    </div>

    <!-- 二维码过期 -->
    <div v-else-if="step === 'expired'" class="text-center py-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
        <el-icon class="text-3xl text-amber-600 dark:text-amber-400"><WarningFilled /></el-icon>
      </div>
      <p class="text-lg font-medium text-amber-700 dark:text-amber-400 mb-2">二维码已过期</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">请重新获取二维码</p>
      <el-button type="primary" @click="startQRLogin">刷新二维码</el-button>
    </div>

    <template #footer>
      <template v-if="step === 'select'">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :disabled="!selectedAccount"
          @click="useExistingAccount"
        >
          使用选中的账号
        </el-button>
      </template>
      <template v-else-if="step === 'config'">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :disabled="!deviceName.trim() || binding"
          :loading="binding"
          @click="handleConfirm"
        >
          确认绑定
        </el-button>
      </template>
      <template v-else-if="step === 'success'">
        <el-button type="primary" @click="handleSuccess">完成</el-button>
      </template>
      <template v-else-if="step !== 'loading' && step !== 'polling'">
        <el-button @click="handleClose">取消</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, SuccessFilled, WarningFilled, CircleCheck, ArrowLeft } from '@element-plus/icons-vue'
import QrcodeVue from 'qrcode.vue'
import { initMiQRLogin, pollMiQRStatus, confirmMiBind, rebindMiChannel } from '@/api/misound'
import { getChannels } from '@/api/channel'

const props = defineProps({
  visible: Boolean,
  mode: { type: String, default: 'create' },
  channelId: Number,
})
const emit = defineEmits(['update:visible', 'success'])

// 状态
const step = ref('idle')  // idle | select | loading | qrcode | polling | config | success | error | expired
const errorMsg = ref('')

// 已有账号列表
const existingAccounts = ref([])
const selectedAccount = ref(null)

// 扫码相关
const qrCodeUrl = ref('')
const loginUrl = ref('')
const sessionId = ref('')
const credentials = ref({})

// 配置表单
const deviceName = ref('')
const channelName = ref('小爱音箱')
const ttsMode = ref('auto')
const binding = ref(false)
const boundDeviceName = ref('')

// 防止重复轮询
let isPolling = false

watch(() => props.visible, (val) => {
  if (val) {
    loadExistingAccounts()
  } else {
    cleanup()
  }
})

/**
 * 加载已有的小米账号
 */
async function loadExistingAccounts() {
  try {
    const res = await getChannels()
    if (res.success && res.data) {
      // 从已有的 misound 渠道中提取唯一的账号
      const channels = res.data.filter(ch => ch.channel_type === 'misound' && ch.config)
      const accountMap = new Map()
      
      channels.forEach(channel => {
        const userId = channel.config.userId
        if (userId) {
          if (!accountMap.has(userId)) {
            accountMap.set(userId, {
              userId,
              passToken: channel.config.passToken,
              channelCount: 0,
            })
          }
          accountMap.get(userId).channelCount++
        }
      })
      
      existingAccounts.value = Array.from(accountMap.values())
      
      // 如果有已有账号，显示选择界面；否则直接进入扫码
      if (existingAccounts.value.length > 0) {
        step.value = 'select'
      } else {
        startQRLogin()
      }
    } else {
      // 没有已有账号，直接扫码
      startQRLogin()
    }
  } catch {
    // 加载已有账号失败，直接进入扫码流程
    startQRLogin()
  }
}

/**
 * 使用已有账号
 */
function useExistingAccount() {
  if (!selectedAccount.value) {
    ElMessage.warning('请选择一个账号')
    return
  }
  
  credentials.value = {
    userId: selectedAccount.value.userId,
    passToken: selectedAccount.value.passToken,
  }
  
  step.value = 'config'
}

/**
 * 开始扫码登录
 */
function startQRLogin() {
  selectedAccount.value = null
  fetchQRCode()
}

/**
 * 获取登录二维码
 */
async function fetchQRCode() {
  step.value = 'loading'
  errorMsg.value = ''

  try {
    const res = await initMiQRLogin()
    if (res.success && res.data) {
      qrCodeUrl.value = res.data.qrCodeUrl
      loginUrl.value = res.data.loginUrl
      sessionId.value = res.data.sessionId
      step.value = 'qrcode'

      setTimeout(() => {
        if (props.visible && step.value === 'qrcode') {
          startPolling()
        }
      }, 1000)
    } else {
      step.value = 'error'
      errorMsg.value = res.message || '获取二维码失败'
    }
  } catch (error) {
    step.value = 'error'
    errorMsg.value = error.message || '获取二维码失败，请检查网络连接'
  }
}

/**
 * 开始轮询扫码状态
 */
function startPolling() {
  if (isPolling) return
  isPolling = true
  step.value = 'polling'
  doPoll()
}

/**
 * 执行一次轮询
 */
async function doPoll() {
  if (!sessionId.value || !isPolling) return

  try {
    const res = await pollMiQRStatus(sessionId.value)

    if (!res.success || !res.data) {
      setTimeout(doPoll, 3000)
      return
    }

    switch (res.data.status) {
      case 'confirmed':
        isPolling = false
        credentials.value = {
          userId: res.data.userId,
          passToken: res.data.passToken,
        }
        step.value = 'config'
        break

      case 'expired':
        isPolling = false
        step.value = 'expired'
        break

      case 'canceled':
        isPolling = false
        step.value = 'expired'
        errorMsg.value = '用户取消了登录'
        break

      case 'failed':
        isPolling = false
        step.value = 'error'
        errorMsg.value = res.data.message || '扫码失败'
        break

      default:
        setTimeout(doPoll, 2000)
        break
    }
  } catch {
    setTimeout(doPoll, 5000)
  }
}

/**
 * 确认绑定
 */
async function handleConfirm() {
  const did = deviceName.value.trim()
  
  if (!did) {
    ElMessage.warning('请输入设备名称')
    return
  }

  binding.value = true

  try {
    let res
    if (props.mode === 'rebind' && props.channelId) {
      res = await rebindMiChannel(props.channelId, {
        userId: credentials.value.userId,
        passToken: credentials.value.passToken,
        did,
        ttsMode: ttsMode.value,
      })
    } else {
      res = await confirmMiBind({
        userId: credentials.value.userId,
        passToken: credentials.value.passToken,
        did,
        name: channelName.value || '小爱音箱',
        ttsMode: ttsMode.value,
      })
    }

    if (res.success) {
      boundDeviceName.value = channelName.value || did
      step.value = 'success'
    } else {
      ElMessage.error(res.message || '绑定失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '绑定失败')
  } finally {
    binding.value = false
  }
}

function handleClose() {
  if (step.value === 'polling') return
  cleanup()
  emit('update:visible', false)
}

function handleSuccess() {
  emit('success')
  cleanup()
  emit('update:visible', false)
}

function reset() {
  cleanup()
  loadExistingAccounts()
}

function cleanup() {
  isPolling = false
  step.value = 'idle'
  qrCodeUrl.value = ''
  loginUrl.value = ''
  sessionId.value = ''
  credentials.value = {}
  selectedAccount.value = null
  deviceName.value = ''
  channelName.value = '小爱音箱'
  ttsMode.value = 'auto'
  binding.value = false
  boundDeviceName.value = ''
  errorMsg.value = ''
}
</script>
