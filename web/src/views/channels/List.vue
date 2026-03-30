<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">渠道管理</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">绑定和管理您的消息推送渠道</p>
      </div>
      <el-button type="primary" @click="showCreateDialog = true">
        <Plus class="w-4 h-4 mr-1" />
        绑定渠道
      </el-button>
    </div>

    <!-- 渠道类型说明 -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
      <div class="flex items-start gap-3">
        <Info class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div class="text-sm text-blue-700 dark:text-blue-300">
          <p class="font-medium mb-1">支持的渠道类型</p>
          <p class="opacity-80">
            微信龙虾机器人 · 企业微信 · 钉钉 · 飞书 · Telegram · 微信公众号 · WxPusher · PushPlus · Server酱 · Webhook · SMTP邮件 · Gotify · Meow
          </p>
        </div>
      </div>
    </div>

    <!-- 渠道列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="channel in channels"
        :key="channel.id"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div
              :class="[
                'w-10 h-10 rounded-lg flex items-center justify-center',
                getChannelColor(channel.channel_type)
              ]"
            >
              <component :is="getChannelIcon(channel.channel_type)" class="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ channel.name }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ getChannelTypeName(channel.channel_type) }}
              </p>
            </div>
          </div>
          <el-dropdown @command="(cmd) => handleCommand(cmd, channel)">
            <el-button text>
              <MoreVertical class="w-4 h-4" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <Edit class="w-4 h-4 mr-2" />
                  编辑
                </el-dropdown-item>
                <el-dropdown-item v-if="channel.channel_type === 'wechatclawbot'" command="rebind">
                  <RefreshCw class="w-4 h-4 mr-2" />
                  重新绑定
                </el-dropdown-item>
                <el-dropdown-item command="test">
                  <TestTube class="w-4 h-4 mr-2" />
                  测试
                </el-dropdown-item>
                <el-dropdown-item divided command="delete">
                  <Trash2 class="w-4 h-4 mr-2" />
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <!-- 配置信息 -->
        <div class="space-y-2 mb-4">
          <div
            v-for="(value, key) in getDisplayConfig(channel)"
            :key="key"
            class="flex items-center text-sm"
          >
            <span class="text-gray-500 dark:text-gray-400 w-16">{{ key }}:</span>
            <span class="text-gray-700 dark:text-gray-300 truncate">{{ value }}</span>
          </div>
        </div>

        <!-- 微信龙虾机器人额度状态 -->
        <div
          v-if="channel.channel_type === 'wechatclawbot' && getClawbotQuota(channel)"
          class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
        >
          <span class="flex items-center gap-1">
            <Send class="w-3.5 h-3.5" />
            已发 {{ getClawbotQuota(channel).sendCount }}/10
          </span>
          <span class="flex items-center gap-1">
            <Clock class="w-3.5 h-3.5" />
            {{ getClawbotQuota(channel).remainText }}
          </span>
        </div>

        <!-- 状态 -->
        <div class="flex items-center justify-between">
          <el-tag :type="channel.is_active ? 'success' : 'info'" size="small">
            {{ channel.is_active ? '已启用' : '已禁用' }}
          </el-tag>
          <el-switch
            v-model="channel.is_active"
            :active-value="1"
            :inactive-value="0"
            @change="(val) => toggleActive(channel, val)"
          />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="channels.length === 0" class="text-center py-16">
      <div class="w-20 h-20 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Share2 class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无渠道</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">绑定您的第一个消息推送渠道</p>
      <el-button type="primary" @click="showCreateDialog = true">
        <Plus class="w-4 h-4 mr-1" />
        绑定渠道
      </el-button>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingChannel ? '编辑渠道' : '绑定渠道'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-position="top"
      >
        <el-form-item label="渠道类型" prop="channelType">
          <el-select
            v-model="form.channelType"
            placeholder="选择渠道类型"
            class="w-full"
            :disabled="!!editingChannel"
          >
            <el-option
              v-for="type in channelTypes"
              :key="type.type"
              :label="type.name"
              :value="type.type"
            >
              <div class="flex items-center gap-2">
                <span>{{ type.name }}</span>
                <span class="text-gray-400 text-xs">- {{ type.description }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 微信龙虾机器人：扫码绑定提示 -->
        <div v-if="form.channelType === 'wechatclawbot' && !editingChannel" class="text-center py-4">
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-left mb-4">
            <p class="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1.5">⚠️ 推送限制说明</p>
            <ul class="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
              <li>机器人连续主动发送 <strong>10 条</strong>消息后，需您主动发送一条消息才能继续推送</li>
              <li>自您上次主动发消息起 <strong>24 小时</strong>后，也需主动发消息才能继续推送</li>
              <li>系统会在接近限额时自动在消息中提醒您</li>
              <li>微信限制，暂无更好的解决方案，建议接口同时开启多个推送渠道</li>
            </ul>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            微信龙虾机器人需要通过扫码方式绑定，点击下方按钮开始
          </p>
          <el-button type="primary" class="mt-3" @click="openClawbotBind">
            扫码绑定
          </el-button>
        </div>

        <el-form-item v-if="form.channelType !== 'wechatclawbot'" label="渠道名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入渠道名称" />
        </el-form-item>

        <!-- 动态配置字段 -->
        <template v-if="currentChannelType && form.channelType !== 'wechatclawbot'">
          <el-form-item
            v-for="field in currentChannelType.configFields"
            :key="field.name"
            :label="field.label"
            :required="field.required"
          >
            <!-- 下拉选择 -->
            <el-select
              v-if="field.type === 'select'"
              v-model="form.config[field.name]"
              :placeholder="field.placeholder"
              class="w-full"
            >
              <el-option
                v-for="opt in field.options"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <!-- 文本域 -->
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="form.config[field.name]"
              :placeholder="field.placeholder"
              type="textarea"
              :rows="4"
            />
            <!-- JSON 输入 -->
            <el-input
              v-else-if="field.type === 'json'"
              v-model="form.config[field.name]"
              :placeholder="field.placeholder"
              type="textarea"
              :rows="3"
            />
            <!-- 密码输入 -->
            <el-input
              v-else-if="field.type === 'password'"
              v-model="form.config[field.name]"
              :placeholder="field.placeholder"
              type="password"
              show-password
            />
            <!-- 开关 -->
            <el-switch
              v-else-if="field.type === 'switch'"
              v-model="form.config[field.name]"
            />
            <!-- 数字输入 -->
            <el-input
              v-else-if="field.type === 'number'"
              v-model="form.config[field.name]"
              :placeholder="field.placeholder"
              type="number"
            />
            <!-- 普通文本 -->
            <el-input
              v-else
              v-model="form.config[field.name]"
              :placeholder="field.placeholder"
            />
            <p v-if="field.description" class="text-xs text-gray-500 mt-1">
              {{ field.description }}
            </p>
          </el-form-item>
        </template>
      </el-form>

      <template v-if="form.channelType !== 'wechatclawbot'" #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">
          {{ editingChannel ? '保存' : '绑定' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 微信龙虾机器人扫码绑定弹窗 -->
    <ClawbotBindDialog
      v-model:visible="showClawbotDialog"
      :mode="clawbotBindMode"
      :channel-id="clawbotBindChannelId"
      @success="handleClawbotBindSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getChannels, getChannelTypes, createChannel, updateChannel, deleteChannel, testChannel } from '@/api/channel'
import {
  Plus,
  Share2,
  MoreVertical,
  Edit,
  TestTube,
  Trash2,
  Info,
  MessageCircle,
  Send,
  Bell,
  Smartphone,
  Users,
  MessageSquare,
  Webhook,
  RefreshCw,
  Cat,
  Clock,
} from 'lucide-vue-next'
import ClawbotBindDialog from '@/components/ClawbotBindDialog.vue'

const channels = ref([])
const channelTypes = ref([])
const showCreateDialog = ref(false)
const formLoading = ref(false)
const editingChannel = ref(null)
const showClawbotDialog = ref(false)
const clawbotBindMode = ref('create')
const clawbotBindChannelId = ref(null)

const formRef = ref(null)
const form = reactive({
  channelType: '',
  name: '',
  config: {},
})

const formRules = {
  channelType: [{ required: true, message: '请选择渠道类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入渠道名称', trigger: 'blur' }],
}

const currentChannelType = computed(() => {
  return channelTypes.value.find(t => t.type === form.channelType)
})

const getChannelTypeName = (type) => {
  const found = channelTypes.value.find(t => t.type === type)
  return found?.name || type
}

const getChannelColor = (type) => {
  const colors = {
    wecom: 'bg-green-500',
    telegram: 'bg-blue-500',
    pushplus: 'bg-orange-500',
    wxpusher: 'bg-emerald-500',
    feishu: 'bg-blue-600',
    dingtalk: 'bg-blue-400',
    webhook: 'bg-purple-500',
    wechat_official: 'bg-green-600',
    serverchan: 'bg-amber-500',
    smtp: 'bg-red-500',
    wechatclawbot: 'bg-rose-500',
    gotify: 'bg-indigo-500',
    meow: 'bg-orange-600',
    qqbot: 'bg-cyan-500',
  }
  return colors[type] || 'bg-gray-500'
}

const getChannelIcon = (type) => {
  const icons = {
    wecom: MessageCircle,
    telegram: Send,
    pushplus: Bell,
    wxpusher: Smartphone,
    feishu: Users,
    dingtalk: MessageSquare,
    webhook: Webhook,
    wechat_official: MessageCircle,
    serverchan: Send,
    smtp: MessageCircle,
    wechatclawbot: RefreshCw,
    gotify: Bell,
    meow: Cat,
    qqbot: MessageSquare,
  }
  return icons[type] || Share2
}

const getDisplayConfig = (channel) => {
  const displayConfig = {}
  if (channel.channel_type === 'wechatclawbot') {
    if (channel.config.toUserId) displayConfig['用户ID'] = channel.config.toUserId
    if (channel.config.botId) displayConfig['BotID'] = channel.config.botId
    return displayConfig
  }
  const type = channelTypes.value.find(t => t.type === channel.channel_type)
  if (type) {
    type.configFields.forEach(field => {
      const value = channel.config[field.name]
      if (value) {
        displayConfig[field.label] = field.type === 'password' ? '********' : value
      }
    })
  }
  return displayConfig
}

const getClawbotQuota = (channel) => {
  const config = channel.config
  if (!config.lastUserMsgTime) return null
  const remainMs = 24 * 3600 * 1000 - (Date.now() - config.lastUserMsgTime)
  if (remainMs <= 0) return { sendCount: config.sendCount || 0, remainText: '窗口已过期，需回复消息' }
  const remainMin = Math.round(remainMs / 60000)
  const h = Math.floor(remainMin / 60)
  const m = remainMin % 60
  const remainText = h > 0 ? `剩余 ${h}小时${m}分钟` : `剩余 ${m}分钟`
  return { sendCount: config.sendCount || 0, remainText }
}

const loadData = async () => {
  try {
    const [channelsRes, typesRes] = await Promise.all([
      getChannels(),
      getChannelTypes(),
    ])
    if (channelsRes.success) {
      channels.value = channelsRes.data || []
    }
    if (typesRes.success) {
      channelTypes.value = typesRes.data || []
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

const handleCommand = (command, channel) => {
  if (command === 'edit') {
    editingChannel.value = channel
    form.channelType = channel.channel_type
    form.name = channel.name
    // 处理 config，将 JSON 对象转为字符串
    const processedConfig = { ...channel.config }
    const type = channelTypes.value.find(t => t.type === channel.channel_type)
    if (type) {
      type.configFields.forEach(field => {
        if (field.type === 'json' && processedConfig[field.name] && typeof processedConfig[field.name] === 'object') {
          processedConfig[field.name] = JSON.stringify(processedConfig[field.name], null, 2)
        }
      })
    }
    form.config = processedConfig
    showCreateDialog.value = true
  } else if (command === 'rebind') {
    clawbotBindMode.value = 'rebind'
    clawbotBindChannelId.value = channel.id
    showClawbotDialog.value = true
  } else if (command === 'test') {
    handleTest(channel)
  } else if (command === 'delete') {
    handleDelete(channel)
  }
}

const handleTest = async (channel) => {
  try {
    const res = await testChannel(channel.id)
    if (res.success && res.data.success) {
      ElMessage.success('测试消息发送成功')
    } else {
      ElMessage.error(res.data?.message || '测试失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '测试失败')
  }
}

const handleDelete = async (channel) => {
  try {
    await ElMessageBox.confirm('删除后无法恢复，是否继续？', '提示', {
      type: 'warning',
    })
    const res = await deleteChannel(channel.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const toggleActive = async (channel, val) => {
  try {
    const res = await updateChannel(channel.id, { is_active: val })
    if (res.success) {
      ElMessage.success(val ? '渠道已启用' : '渠道已禁用')
    }
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
    channel.is_active = !val
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  formLoading.value = true
  try {
    // 处理 config 中的 JSON 字段
    const processedConfig = { ...form.config }
    if (currentChannelType.value) {
      currentChannelType.value.configFields.forEach(field => {
        if (field.type === 'json' && processedConfig[field.name]) {
          try {
            processedConfig[field.name] = JSON.parse(processedConfig[field.name])
          } catch {
            throw new Error(`${field.label} 格式不正确，必须是有效的 JSON`)
          }
        }
      })
    }

    if (editingChannel.value) {
      const res = await updateChannel(editingChannel.value.id, {
        name: form.name,
        config: processedConfig,
      })
      if (res.success) {
        ElMessage.success('更新成功')
      }
    } else {
      const res = await createChannel({
        channelType: form.channelType,
        name: form.name,
        config: processedConfig,
      })
      if (res.success) {
        ElMessage.success('绑定成功')
      }
    }
    showCreateDialog.value = false
    resetForm()
    loadData()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  editingChannel.value = null
  form.channelType = ''
  form.name = ''
  form.config = {}
}

const openClawbotBind = () => {
  clawbotBindMode.value = 'create'
  clawbotBindChannelId.value = null
  showClawbotDialog.value = true
}

const handleClawbotBindSuccess = () => {
  showCreateDialog.value = false
  resetForm()
  loadData()
}

onMounted(() => {
  loadData()
})
</script>
