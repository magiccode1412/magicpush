<template>
  <el-dialog
    :model-value="visible"
    :title="mode === 'rebind' ? '重新绑定微信龙虾机器人' : '绑定微信龙虾机器人'"
    width="420px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="text-center">
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
      <el-button @click="handleClose">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
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
  pollTimer = setInterval(async () => {
    try {
      const res = await getClawbotQRStatus(qrcodeId.value)
      if (!res.success || !res.data) return

      switch (res.data.status) {
        case 'scaned':
          status.value = 'scaned'
          break
        case 'confirmed':
          status.value = 'confirmed'
          clearInterval(pollTimer)
          pollTimer = null
          botData.value = res.data
          await confirmBind()
          break
        case 'expired':
          status.value = 'expired'
          clearInterval(pollTimer)
          pollTimer = null
          break
        case 'canceled':
          status.value = 'expired'
          clearInterval(pollTimer)
          pollTimer = null
          break
      }
    } catch (error) {
      clearInterval(pollTimer)
      pollTimer = null
      status.value = 'error'
      errorMsg.value = '轮询失败: ' + (error.message || '未知错误')
    }
  }, 2000)
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
      ElMessage.success(props.mode === 'rebind' ? '重新绑定成功' : '绑定成功')
      emit('success', res.data)
      emit('update:visible', false)
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
  emit('update:visible', false)
}

function cleanup() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onUnmounted(cleanup)
</script>
