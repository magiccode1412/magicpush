<template>
  <el-dialog
    :model-value="visible"
    :title="mode === 'rebind' ? '重新绑定微信龙虾机器人' : '绑定微信龙虾机器人'"
    width="420px"
    :close-on-click-modal="false"
    :close-on-press-escape="!showReminder"
    :show-close="!showReminder"
    @close="handleClose"
  >
    <!-- 绑定成功提醒 -->
    <div v-if="showReminder" class="text-center py-4">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
        <el-icon class="text-2xl text-green-600 dark:text-green-400"><SuccessFilled /></el-icon>
      </div>
      <p class="text-base font-medium text-gray-900 dark:text-white mb-3">绑定成功</p>
      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-left">
        <p class="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">⚠️ 重要提示</p>
        <p class="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
          绑定成功后，请务必向微信龙虾机器人<strong>主动发送一条消息</strong>，否则无法实现消息推送。
        </p>
      </div>
    </div>

    <div v-else class="text-center">
      <!-- 提示文字 -->
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        请使用微信扫描下方二维码完成绑定
      </p>

      <!-- 加载中 -->
      <div v-if="status === 'loading'" class="py-12">
        <el-icon class="is-loading text-3xl text-gray-400"><Loading /></el-icon>
        <p class="text-sm text-gray-400 mt-2">正在获取二维码...</p>
      </div>

      <!-- 二维码 -->
      <div v-else-if="qrCodeUrl" class="inline-block p-3 bg-white rounded-lg border border-gray-200">
        <QrcodeVue :value="qrCodeUrl" :size="200" level="M" />
      </div>

      <!-- 状态文字 -->
      <div class="mt-4">
        <p v-if="status === 'polling'" class="text-sm text-gray-500">
          等待扫码...
        </p>
        <p v-else-if="status === 'scaned'" class="text-sm text-blue-600">
          已扫码，请在微信中确认
        </p>
        <p v-else-if="status === 'confirmed'" class="text-sm text-green-600">
          绑定成功
        </p>
        <p v-else-if="status === 'expired'" class="text-sm text-red-500">
          二维码已过期，请点击刷新
        </p>
        <p v-else-if="status === 'error'" class="text-sm text-red-500">
          {{ errorMsg }}
        </p>
      </div>

      <!-- 刷新按钮 -->
      <el-button
        v-if="status === 'expired' || status === 'error'"
        class="mt-4"
        @click="fetchQRCode"
      >
        刷新二维码
      </el-button>
    </div>

    <template #footer>
      <el-button v-if="!showReminder" @click="handleClose">取消</el-button>
      <el-button v-if="showReminder" type="primary" @click="handleReminderConfirm">
        我已发送
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, SuccessFilled } from '@element-plus/icons-vue'
import QrcodeVue from 'qrcode.vue'
import { getClawbotQRCode, getClawbotQRStatus, clawbotBindConfirm, clawbotRebind } from '@/api/channel'

const props = defineProps({
  visible: Boolean,
  mode: { type: String, default: 'create' },
  channelId: Number,
})
const emit = defineEmits(['update:visible', 'success'])

const qrCodeUrl = ref('')
const qrcodeId = ref('')
const status = ref('idle')
const errorMsg = ref('')
const botData = ref({})
const showReminder = ref(false)
let pollTimer = null

watch(() => props.visible, (val) => {
  if (val) {
    fetchQRCode()
  } else {
    cleanup()
  }
})

async function fetchQRCode() {
  status.value = 'loading'
  errorMsg.value = ''
  try {
    const res = await getClawbotQRCode()
    if (res.success && res.data) {
      qrCodeUrl.value = res.data.qrcodeUrl
      qrcodeId.value = res.data.qrcode
      status.value = 'polling'
      startPolling()
    } else {
      status.value = 'error'
      errorMsg.value = res.message || '获取二维码失败'
    }
  } catch (error) {
    status.value = 'error'
    errorMsg.value = error.message || '获取二维码失败'
  }
}

function startPolling() {
  cleanup()
  pollTimer = null
  doPoll()
}

async function doPoll() {
  if (!qrcodeId.value) return
  try {
    const res = await getClawbotQRStatus(qrcodeId.value)
    if (!res.success || !res.data) {
      pollTimer = setTimeout(doPoll, 2000)
      return
    }

    switch (res.data.status) {
      case 'scaned':
        status.value = 'scaned'
        pollTimer = setTimeout(doPoll, 2000)
        break
      case 'confirmed':
        status.value = 'confirmed'
        botData.value = res.data
        await confirmBind()
        break
      case 'expired':
      case 'canceled':
        status.value = 'expired'
        break
      default:
        pollTimer = setTimeout(doPoll, 2000)
        break
    }
  } catch (error) {
    pollTimer = setTimeout(doPoll, 2000)
  }
}

async function confirmBind() {
  try {
    let res
    if (props.mode === 'rebind' && props.channelId) {
      res = await clawbotRebind(props.channelId, {
        token: botData.value.token,
        botId: botData.value.botId,
        userId: botData.value.userId,
        baseUrl: botData.value.baseUrl,
      })
    } else {
      res = await clawbotBindConfirm({
        token: botData.value.token,
        botId: botData.value.botId,
        userId: botData.value.userId,
        baseUrl: botData.value.baseUrl,
      })
    }
    if (res.success) {
      showReminder.value = true
    } else {
      ElMessage.error(res.message || '绑定失败')
      status.value = 'error'
      errorMsg.value = res.message || '绑定失败'
    }
  } catch (error) {
    ElMessage.error(error.message || '绑定失败')
    status.value = 'error'
    errorMsg.value = error.message || '绑定失败'
  }
}

function handleClose() {
  if (showReminder.value) return
  emit('update:visible', false)
}

function handleReminderConfirm() {
  ElMessage.success(props.mode === 'rebind' ? '重新绑定成功' : '绑定成功')
  emit('success', botData.value)
  showReminder.value = false
  emit('update:visible', false)
}

function cleanup() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

onUnmounted(cleanup)
</script>
