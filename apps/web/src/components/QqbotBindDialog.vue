<template>
  <el-dialog
    :model-value="visible"
    :title="mode === 'rebind' ? '重新绑定 QQ 机器人' : '绑定 QQ 机器人'"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 步骤 1：连接中 -->
    <div v-if="step === 'connecting'" class="text-center py-8">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
        <el-icon class="is-loading text-3xl text-blue-600 dark:text-blue-400"><Loading /></el-icon>
      </div>
      <p class="text-base font-medium text-gray-900 dark:text-white mb-2">正在连接 QQ 机器人网关...</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">正在建立 WebSocket 连接并完成鉴权</p>
    </div>

    <!-- 步骤 2：连接失败 -->
    <div v-else-if="step === 'connect_failed'" class="text-center py-8">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <el-icon class="text-3xl text-red-500 dark:text-red-400"><CircleCloseFilled /></el-icon>
      </div>
      <p class="text-base font-medium text-red-600 dark:text-red-400 mb-2">连接失败</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ errorMsg || '无法连接到 QQ 机器人网关，请检查配置或网络' }}</p>
      <el-button type="primary" @click="retryConnect">重试</el-button>
    </div>

    <!-- 步骤 3：等待用户发消息（握手） -->
    <div v-else-if="step === 'waiting_handshake'" class="py-6">
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-5 text-left">
        <div class="flex items-center gap-2 mb-3">
          <el-icon class="text-green-600 dark:text-green-400 text-lg"><SuccessFilled /></el-icon>
          <p class="text-sm font-semibold text-green-800 dark:text-green-300">已成功连接 QQ 机器人网关</p>
          <span v-if="botInfo?.id" class="text-xs text-gray-500">(Bot ID: {{ botInfo.id }})</span>
        </div>

        <div class="space-y-3">
          <div class="flex items-start gap-2 bg-white dark:bg-gray-800/50 rounded-lg p-3">
            <span class="text-lg leading-none mt-0.5">📱</span>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">下一步：完成握手绑定</p>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                请在<strong>QQ</strong>中执行以下操作之一：
              </p>
              <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-1.5 list-disc list-inside">
                <li><strong>群聊场景：</strong>在目标群中 @机器人 发送一条任意消息</li>
                <li><strong>私聊场景：</strong>直接给机器人发一条私信（需先在QQ中添加机器人为好友）</li>
                <li><strong>频道场景：</strong>在频道子频道中 @机器人 发送一条消息</li>
              </ul>
            </div>
          </div>

          <div class="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-700">
            <span class="text-base leading-none mt-0.5">💡</span>
            <div>
              <p class="text-xs font-medium text-amber-800 dark:text-amber-300">提示</p>
              <ul class="text-xs text-amber-700 dark:text-amber-400 space-y-1 mt-1 list-disc list-inside">
                <li>发送任意内容即可，如"你好"或一个表情</li>
                <li>系统会自动从消息中提取 OpenID 并完成绑定</li>
                <li>群聊场景优先提取群 ID，私聊场景提取用户 ID</li>
                <li>首次添加机器人可能需要在 QQ 开放平台确认授权</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
          已发送消息？
        </p>
        <el-button type="primary" @click="checkBindStatus" :loading="checkingBind">
          我已发送消息
        </el-button>
        <p v-if="bindCheckCount > 0 && !isBound" class="text-xs text-gray-400 mt-2">
          正在检测... (第 {{ bindCheckCount }} 次)
        </p>
      </div>
    </div>

    <!-- 步骤 4：绑定成功 -->
    <div v-else-if="step === 'bound'" class="text-center py-8">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
        <el-icon class="text-3xl text-green-600 dark:text-green-400"><SuccessFilled /></el-icon>
      </div>
      <p class="text-base font-medium text-green-700 dark:text-green-400 mb-2">绑定成功！</p>
      <div class="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
        <template v-if="bindData">
          <p v-if="bindData.senderNickname">已绑定用户: {{ bindData.senderNickname }}</p>
          <p class="mt-1 text-xs font-mono break-all">{{ bindData.targetIdDisplay || bindData.targetId }}</p>
          <p class="mt-2">推送场景: <el-tag size="small" type="info">{{ getMsgTypeLabel(bindData.msgType) }}</el-tag></p>
        </template>
        <p v-else>现在可以正常接收推送消息了</p>
      </div>
    </div>

    <template #footer>
      <el-button
        v-if="!['connecting', 'bound'].includes(step)"
        @click="handleClose"
      >
        取消
      </el-button>
      <el-button
        v-if="step === 'bound'"
        type="primary"
        @click="emit('update:visible', false); emit('success')"
      >
        完成
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, SuccessFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { getQqbotBindStatus, startQqbotBind, retryQqbotBind } from '@/api/qqbot'

const props = defineProps({
  visible: Boolean,
  mode: { type: String, default: 'create' },
  channelId: [Number, String],
})

const emit = defineEmits(['update:visible', 'success'])

// 状态机: connecting | connect_failed | waiting_handshake | bound
const step = ref('idle')
const errorMsg = ref('')
const checkingBind = ref(false)
const bindCheckCount = ref(0)
const isBound = ref(false)
const bindData = ref(null)
const botInfo = ref(null)

// 轮询定时器
let pollTimer = null

watch(() => props.visible, (val) => {
  if (val) {
    startFlow()
  } else {
    cleanup()
  }
})

async function startFlow() {
  step.value = 'connecting'
  errorMsg.value = ''
  bindCheckCount.value = 0
  bindData.value = null
  botInfo.value = null
  isBound.value = false

  try {
    // 触发后端为该渠道建立 WS 连接
    if (props.mode === 'rebind' && props.channelId) {
      await retryQqbotBind(props.channelId)
    } else if (props.channelId) {
      await startQqbotBind(props.channelId)
    }
  } catch (e) {
    console.warn('[QqbotBind] 启动连接请求失败:', e.message)
  }

  // 开始轮询连接状态
  startPolling()
}

function startPolling() {
  cleanup()
  doPoll()
}

async function doPoll() {
  if (!props.channelId) return

  try {
    const res = await getQqbotBindStatus(props.channelId)
    if (!res.success) {
      pollTimer = setTimeout(doPoll, 3000)
      return
    }

    const data = res.data || {}
    const connState = data.connectionState || ''

    // 保存 Bot 信息
    if (data.botInfo) {
      botInfo.value = data.botInfo
    }

    // 连接中 / 重连中 / 鉴权中 -> 继续等
    if (['connecting', 'identifying', 'reconnecting', 'resuming'].includes(connState)) {
      step.value = 'connecting'
      pollTimer = setTimeout(doPoll, 3000)
      return
    }

    // 断开
    if (connState === 'disconnected') {
      step.value = 'connect_failed'
      errorMsg.value = 'WebSocket 连接已断开'
      return
    }

    // 已连接但未握手
    if ((connState === 'connected' || connState === 'unknown') && !data.bound) {
      step.value = 'waiting_handshake'
      // 不再自动轮询，等用户点"我已发送消息"
      return
    }

    // 已绑定
    if (data.bound) {
      step.value = 'bound'
      bindData.value = data
      isBound.value = true
      emit('success')
      return
    }

    // 其他情况继续轮询
    pollTimer = setTimeout(doPoll, 3000)
  } catch (error) {
    console.warn('[QqbotBind] 轮询异常:', error.message)
    pollTimer = setTimeout(doPoll, 3000)
  }
}

/** 用户点击"我已发送消息"后主动检查绑定状态 */
async function checkBindStatus() {
  if (!props.channelId) return
  checkingBind.value = true
  bindCheckCount.value++

  try {
    const res = await getQqbotBindStatus(props.channelId)
    const data = res.data || {}

    if (data.botInfo) {
      botInfo.value = data.botInfo
    }

    if (data.bound) {
      step.value = 'bound'
      bindData.value = data
      isBound.value = true
      emit('success')
      return
    }

    // 未绑定，继续轮询几次自动检测
    for (let i = 0; i < 15; i++) {
      bindCheckCount.value++
      await new Promise(r => setTimeout(r, 2000))
      try {
        const r = await getQqbotBindStatus(props.channelId)
        const d = r.data || {}
        if (d.bound) {
          step.value = 'bound'
          bindData.value = d
          isBound.value = true
          emit('success')
          return
        }
      } catch {
        // 忽略单次失败
      }
    }

    // 检测超时
    ElMessage.warning('未检测到入站消息，请确认已在QQ中@机器人或给机器人发送了消息')
  } catch (error) {
    ElMessage.error(error.message || '查询绑定状态失败')
  } finally {
    checkingBind.value = false
  }
}

function getMsgTypeLabel(msgType) {
  const labels = {
    group: '群聊',
    c2c: '单聊',
    channel: '子频道',
    dms: '私信',
  }
  return labels[msgType] || msgType || '未知'
}

function retryConnect() {
  if (props.mode === 'rebind' && props.channelId) {
    retryQqbotBind(props.channelId).catch(() => {})
  }
  startFlow()
}

function handleClose() {
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
