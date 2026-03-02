<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">接口管理</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">管理您的推送接口和访问令牌</p>
      </div>
      <el-button type="primary" @click="showCreateDialog = true">
        <Plus class="w-4 h-4 mr-1" />
        新建接口
      </el-button>
    </div>

    <!-- 接口列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="endpoint in endpoints"
        :key="endpoint.id"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Link class="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ endpoint.name }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ endpoint.is_active ? '启用' : '禁用' }}
              </p>
            </div>
          </div>
          <el-dropdown @command="(cmd) => handleCommand(cmd, endpoint)">
            <el-button text>
              <MoreVertical class="w-4 h-4" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <Edit class="w-4 h-4 mr-2" />
                  编辑
                </el-dropdown-item>
                <el-dropdown-item command="token">
                  <Key class="w-4 h-4 mr-2" />
                  重新生成令牌
                </el-dropdown-item>
                <el-dropdown-item divided command="delete">
                  <Trash2 class="w-4 h-4 mr-2" />
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <p v-if="endpoint.description" class="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
          {{ endpoint.description }}
        </p>

        <!-- Token -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">访问令牌</span>
            <el-button text size="small" @click="copyToken(endpoint.token)">
              <Copy class="w-3 h-3 mr-1" />
              复制
            </el-button>
          </div>
          <code class="text-xs text-gray-700 dark:text-gray-300 break-all">{{ endpoint.token }}</code>
        </div>

        <!-- 绑定的渠道 -->
        <div v-if="endpoint.channels && endpoint.channels.length > 0" class="mb-4">
          <div class="flex flex-wrap gap-2">
            <span
              v-for="channel in endpoint.channels"
              :key="channel.id"
              class="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-xs"
            >
              {{ channel.name }}
            </span>
          </div>
        </div>

        <!-- 统计 -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">
            最后使用: {{ endpoint.last_used_at ? formatDate(endpoint.last_used_at) : '从未' }}
          </span>
          <el-switch
            v-model="endpoint.is_active"
            :active-value="1"
            :inactive-value="0"
            @change="(val) => toggleActive(endpoint, val)"
          />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="endpoints.length === 0" class="text-center py-16">
      <div class="w-20 h-20 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Link class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无接口</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">创建您的第一个推送接口</p>
      <el-button type="primary" @click="showCreateDialog = true">
        <Plus class="w-4 h-4 mr-1" />
        新建接口
      </el-button>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingEndpoint ? '编辑接口' : '新建接口'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-position="top"
      >
        <el-form-item label="接口名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入接口名称" />
        </el-form-item>

        <el-form-item label="接口描述">
          <el-input
            v-model="form.description"
            type="textarea"
            rows="3"
            placeholder="请输入接口描述（可选）"
          />
        </el-form-item>

        <el-form-item label="访问令牌">
          <div class="space-y-2">
            <el-radio-group v-model="form.tokenType">
              <el-radio value="auto">自动生成</el-radio>
              <el-radio value="manual">手动设置</el-radio>
            </el-radio-group>

            <el-input
              v-if="form.tokenType === 'manual'"
              v-model="form.token"
              placeholder="请输入自定义令牌（至少6个字符）"
              :show-word-limit="true"
              maxlength="100"
              @blur="validateTokenInput"
            >
              <template #suffix>
                <el-button text size="small" @click="generateRandomToken">
                  <RefreshCw class="w-3 h-3" />
                </el-button>
              </template>
            </el-input>

            <div v-if="tokenValidation.status" class="text-xs" :class="tokenValidation.valid ? 'text-green-600' : 'text-red-600'">
              {{ tokenValidation.message }}
            </div>
          </div>
        </el-form-item>

        <el-form-item label="绑定渠道">
          <el-select
            v-model="form.channelIds"
            multiple
            placeholder="选择要绑定的渠道"
            class="w-full"
          >
            <el-option
              v-for="channel in channels"
              :key="channel.id"
              :label="channel.name"
              :value="channel.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">
          {{ editingEndpoint ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  regenerateToken,
  updateEndpointChannels,
  validateToken,
  getEndpointChannels,
} from '@/api/endpoint'
import { getChannels } from '@/api/channel'
import {
  Plus,
  Link,
  MoreVertical,
  Edit,
  Key,
  Trash2,
  Copy,
  RefreshCw,
} from 'lucide-vue-next'

const endpoints = ref([])
const channels = ref([])
const showCreateDialog = ref(false)
const formLoading = ref(false)
const editingEndpoint = ref(null)

const formRef = ref(null)
const form = reactive({
  name: '',
  description: '',
  token: '',
  tokenType: 'auto',
  channelIds: [],
})

const tokenValidation = reactive({
  status: false,
  valid: false,
  message: '',
})

const formRules = {
  name: [
    { required: true, message: '请输入接口名称', trigger: 'blur' },
    { max: 50, message: '名称不能超过50个字符', trigger: 'blur' },
  ],
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const generateRandomToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  form.token = token
}

const validateTokenInput = async () => {
  if (!form.token) {
    tokenValidation.status = false
    return
  }

  if (form.token.length < 6) {
    tokenValidation.status = true
    tokenValidation.valid = false
    tokenValidation.message = '令牌长度至少为6个字符'
    return
  }

  try {
    const res = await validateToken(form.token)
    if (res.success) {
      if (res.data.valid) {
        tokenValidation.status = true
        tokenValidation.valid = true
        tokenValidation.message = '令牌可用'
      } else {
        tokenValidation.status = true
        tokenValidation.valid = false
        tokenValidation.message = '该令牌已被使用'
      }
    }
  } catch (error) {
    tokenValidation.status = false
  }
}

const loadData = async () => {
  try {
    const [endpointsRes, channelsRes] = await Promise.all([
      getEndpoints(),
      getChannels(),
    ])
    if (endpointsRes.success) {
      endpoints.value = endpointsRes.data || []
    }
    if (channelsRes.success) {
      channels.value = channelsRes.data || []
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

const copyToken = (token) => {
  navigator.clipboard.writeText(token)
  ElMessage.success('令牌已复制')
}

const handleCommand = async (command, endpoint) => {
  if (command === 'edit') {
    editingEndpoint.value = endpoint
    form.name = endpoint.name
    form.description = endpoint.description || ''
    form.token = endpoint.token
    form.tokenType = 'manual'
    form.channelIds = []
    tokenValidation.status = false

    // 加载已绑定的渠道
    try {
      const res = await getEndpointChannels(endpoint.id)
      if (res.success && res.data) {
        form.channelIds = res.data.map(channel => channel.id)
      }
    } catch (error) {
      console.error('加载渠道失败:', error)
    }

    showCreateDialog.value = true
  } else if (command === 'token') {
    handleRegenerateToken(endpoint)
  } else if (command === 'delete') {
    handleDelete(endpoint)
  }
}

const handleRegenerateToken = async (endpoint) => {
  try {
    await ElMessageBox.confirm('重新生成令牌后，旧令牌将立即失效，是否继续？', '提示', {
      type: 'warning',
    })
    const res = await regenerateToken(endpoint.id)
    if (res.success) {
      ElMessage.success('令牌重新生成成功')
      loadData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

const handleDelete = async (endpoint) => {
  try {
    await ElMessageBox.confirm('删除后无法恢复，是否继续？', '提示', {
      type: 'warning',
    })
    const res = await deleteEndpoint(endpoint.id)
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

const toggleActive = async (endpoint, val) => {
  try {
    const res = await updateEndpoint(endpoint.id, { is_active: val })
    if (res.success) {
      ElMessage.success(val ? '接口已启用' : '接口已禁用')
    }
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
    endpoint.is_active = !val
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 验证手动设置的 token
  if (form.tokenType === 'manual') {
    if (!form.token) {
      ElMessage.error('请输入令牌')
      return
    }
    if (form.token.length < 6) {
      ElMessage.error('令牌长度至少为6个字符')
      return
    }
    if (tokenValidation.status && !tokenValidation.valid) {
      ElMessage.error('该令牌已被使用，请更换')
      return
    }
  }

  formLoading.value = true
  try {
    if (editingEndpoint.value) {
      const res = await updateEndpoint(editingEndpoint.value.id, {
        name: form.name,
        description: form.description,
        token: form.tokenType === 'manual' ? form.token : null,
      })
      if (res.success) {
        // 更新渠道绑定
        if (form.channelIds.length > 0) {
          await updateEndpointChannels(editingEndpoint.value.id, form.channelIds)
        }
        ElMessage.success('更新成功')
      }
    } else {
      const res = await createEndpoint({
        name: form.name,
        description: form.description,
        token: form.tokenType === 'manual' ? form.token : undefined,
      })
      if (res.success) {
        // 绑定渠道
        if (form.channelIds.length > 0) {
          await updateEndpointChannels(res.data.id, form.channelIds)
        }
        ElMessage.success('创建成功')
      }
    }
    showCreateDialog.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  editingEndpoint.value = null
  form.name = ''
  form.description = ''
  form.token = ''
  form.tokenType = 'auto'
  form.channelIds = []
  tokenValidation.status = false
  tokenValidation.valid = false
  tokenValidation.message = ''
}

// 监听对话框关闭，重置表单
watch(showCreateDialog, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})

onMounted(() => {
  loadData()
})
</script>
