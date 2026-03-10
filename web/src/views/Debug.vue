<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">接口调试</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">在线测试推送接口，快速验证配置</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 左侧：请求配置 -->
      <div class="space-y-6">
        <!-- 选择接口 -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings class="w-5 h-5 text-blue-500" />
            请求配置
          </h3>

          <el-form label-position="top">
            <el-form-item label="选择接口">
              <el-select
                v-model="selectedEndpoint"
                placeholder="请选择要测试的接口"
                class="w-full"
                @change="handleEndpointChange"
              >
                <el-option
                  v-for="endpoint in endpoints"
                  :key="endpoint.id"
                  :label="endpoint.name"
                  :value="endpoint.id"
                >
                  <div class="flex items-center justify-between">
                    <span>{{ endpoint.name }}</span>
                    <el-tag size="small" :type="endpoint.is_active ? 'success' : 'danger'">
                      {{ endpoint.is_active ? '启用' : '禁用' }}
                    </el-tag>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="接口类型">
              <el-radio-group v-model="apiType" :disabled="!canUseInbound">
                <el-radio-button label="push">标准推送</el-radio-button>
                <el-radio-button label="inbound" :disabled="!canUseInbound">入站接收</el-radio-button>
              </el-radio-group>
              <div v-if="!canUseInbound && currentEndpoint" class="text-xs text-gray-400 mt-1">
                该接口未启用入站配置
              </div>
            </el-form-item>

            <el-form-item label="请求方式" v-if="apiType === 'push'">
              <el-radio-group v-model="requestMethod">
                <el-radio-button label="GET">GET</el-radio-button>
                <el-radio-button label="POST">POST</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="Token 位置" v-if="apiType === 'push' && requestMethod === 'POST'">
              <el-radio-group v-model="tokenPosition">
                <el-radio-button label="url">URL 路径</el-radio-button>
                <el-radio-button label="header">Authorization 头</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </div>

        <!-- 请求参数 -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Edit3 class="w-5 h-5 text-green-500" />
            请求参数
          </h3>

          <!-- 标准推送参数 -->
          <el-form label-position="top" v-if="apiType === 'push'">
            <el-form-item label="消息标题">
              <el-input
                v-model="form.title"
                placeholder="请输入消息标题（可选）"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="消息内容" required>
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="4"
                placeholder="请输入消息内容"
                maxlength="5000"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="消息类型">
              <el-radio-group v-model="form.type">
                <el-radio-button label="text">纯文本</el-radio-button>
                <el-radio-button label="markdown">Markdown</el-radio-button>
                <el-radio-button label="html">HTML</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                :disabled="!canSubmit"
                @click="handleTest"
                class="w-full"
              >
                <Send class="w-4 h-4 mr-2" />
                {{ loading ? '发送中...' : '发送测试请求' }}
              </el-button>
            </el-form-item>
          </el-form>

          <!-- 入站接收参数 -->
          <el-form label-position="top" v-if="apiType === 'inbound'">
            <el-form-item label="请求体 (JSON)">
              <el-input
                v-model="inboundBody"
                type="textarea"
                :rows="10"
                placeholder='{"alerts": [{"labels": {"alertname": "测试告警"}, "annotations": {"message": "测试消息"}}]}'
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                :disabled="!canSubmitInbound"
                @click="handleInboundTest"
                class="w-full"
              >
                <Send class="w-4 h-4 mr-2" />
                {{ loading ? '发送中...' : '发送测试请求' }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 快捷填充 -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6" v-if="apiType === 'push'">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap class="w-5 h-5 text-yellow-500" />
            快捷填充
          </h3>
          <div class="flex flex-wrap gap-2">
            <el-button @click="fillExample('text')">文本示例</el-button>
            <el-button @click="fillExample('markdown')">Markdown 示例</el-button>
            <el-button @click="fillExample('html')">HTML 示例</el-button>
            <el-button @click="clearForm">清空</el-button>
          </div>
        </div>

        <!-- 入站示例 -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6" v-if="apiType === 'inbound'">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap class="w-5 h-5 text-yellow-500" />
            快捷填充
          </h3>
          <div class="flex flex-wrap gap-2">
            <el-button @click="fillInboundExample('grafana')">Grafana 示例</el-button>
            <el-button @click="fillInboundExample('prometheus')">Prometheus 示例</el-button>
            <el-button @click="fillInboundExample('generic')">通用示例</el-button>
            <el-button @click="clearInboundForm">清空</el-button>
          </div>
        </div>
      </div>

      <!-- 右侧：请求详情和响应 -->
      <div class="space-y-6">
        <!-- 请求详情 -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Terminal class="w-5 h-5 text-purple-500" />
            请求详情
          </h3>

          <div class="space-y-3">
            <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span class="text-xs text-gray-500 dark:text-gray-400 block mb-1">请求 URL</span>
              <code class="text-sm text-gray-700 dark:text-gray-300 break-all">{{ requestUrl }}</code>
            </div>

            <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg" v-if="requestHeaders">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-500 dark:text-gray-400">请求头</span>
                <div class="flex items-center gap-2">
                  <el-radio-group v-model="headerFormat" size="small">
                    <el-radio-button label="text">文本</el-radio-button>
                    <el-radio-button label="json">JSON</el-radio-button>
                  </el-radio-group>
                  <el-button link size="small" @click="copyHeaders">
                    <Copy class="w-3 h-3 mr-1" />
                    复制
                  </el-button>
                </div>
              </div>
              <pre class="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">{{ headerFormat === 'json' ? requestHeadersJson : requestHeaders }}</pre>
            </div>

            <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg" v-if="requestBody">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-500 dark:text-gray-400">请求体</span>
                <el-button link size="small" @click="copyBody">
                  <Copy class="w-3 h-3 mr-1" />
                  复制
                </el-button>
              </div>
              <pre class="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">{{ requestBody }}</pre>
            </div>

            <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg" v-if="curlCommand">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-500 dark:text-gray-400">cURL 命令</span>
                <el-button link size="small" @click="copyCurl">
                  <Copy class="w-3 h-3 mr-1" />
                  复制
                </el-button>
              </div>
              <pre class="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">{{ curlCommand }}</pre>
            </div>
          </div>
        </div>

        <!-- 响应结果 -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6" v-if="response">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare class="w-5 h-5 text-cyan-500" />
            响应结果
          </h3>

          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500 dark:text-gray-400">状态:</span>
              <el-tag :type="response.success ? 'success' : 'danger'">
                {{ response.success ? '成功' : '失败' }}
              </el-tag>
            </div>

            <div v-if="response.code" class="flex items-center gap-2">
              <span class="text-sm text-gray-500 dark:text-gray-400">状态码:</span>
              <code class="text-sm text-gray-700 dark:text-gray-300">{{ response.code }}</code>
            </div>

            <div v-if="response.message" class="flex items-center gap-2">
              <span class="text-sm text-gray-500 dark:text-gray-400">消息:</span>
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ response.message }}</span>
            </div>

            <div class="p-3 bg-gray-900 rounded-lg" v-if="response.data">
              <span class="text-xs text-gray-400 block mb-2">响应数据</span>
              <pre class="text-sm text-green-400 overflow-x-auto">{{ JSON.stringify(response.data, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <!-- 渠道推送详情 -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6" v-if="channelResults.length > 0">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Share2 class="w-5 h-5 text-orange-500" />
            渠道推送详情
          </h3>

          <div class="space-y-3">
            <div
              v-for="(result, index) in channelResults"
              :key="index"
              class="p-3 rounded-lg border"
              :class="result.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-gray-900 dark:text-white">{{ result.channelName }}</span>
                <el-tag :type="result.success ? 'success' : 'danger'" size="small">
                  {{ result.success ? '成功' : '失败' }}
                </el-tag>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                类型: {{ result.channelType }}
              </div>
              <div v-if="!result.success && result.error" class="text-xs text-red-500 mt-1">
                错误: {{ result.error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { getEndpoints } from '@/api/endpoint'
import { useSettingsStore } from '@/stores/settings'
import {
  Settings,
  Edit3,
  Send,
  Terminal,
  MessageSquare,
  Share2,
  Zap,
  Copy,
} from 'lucide-vue-next'

const endpoints = ref([])
const selectedEndpoint = ref(null)
const apiType = ref('push')
const requestMethod = ref('POST')
const tokenPosition = ref('url')
const headerFormat = ref('text')
const loading = ref(false)
const response = ref(null)
const settingsStore = useSettingsStore()

const form = reactive({
  title: '',
  content: '',
  type: 'text',
})

// 入站相关
const inboundBody = ref('')

const currentEndpoint = computed(() => {
  return endpoints.value.find(e => e.id === selectedEndpoint.value)
})

const canSubmit = computed(() => {
  return selectedEndpoint.value && form.content.trim()
})

const canUseInbound = computed(() => {
  return currentEndpoint.value?.inbound_config?.enabled
})

const canSubmitInbound = computed(() => {
  return selectedEndpoint.value && inboundBody.value.trim()
})

const requestUrl = computed(() => {
  if (!currentEndpoint.value) return '请选择接口'
  
  const baseUrl = settingsStore.isProxyEnabled 
    ? settingsStore.proxyUrl.trim().replace(/\/$/, '')
    : window.location.origin
  const token = currentEndpoint.value.token
  
  if (apiType.value === 'inbound') {
    return `${baseUrl}/api/inbound/${token}`
  }
  
  if (requestMethod.value === 'GET') {
    const params = new URLSearchParams()
    if (form.title) params.append('title', form.title)
    if (form.content) params.append('content', form.content)
    params.append('type', form.type)
    return `${baseUrl}/api/push/${token}?${params.toString()}`
  } else {
    if (tokenPosition.value === 'url') {
      return `${baseUrl}/api/push/${token}`
    } else {
      return `${baseUrl}/api/push/`
    }
  }
})

const requestHeaders = computed(() => {
  if (apiType.value === 'inbound') {
    return 'Content-Type: application/json'
  }
  if (requestMethod.value === 'POST' && tokenPosition.value === 'header') {
    return `Authorization: Bearer ${currentEndpoint.value?.token || 'your_token'}\nContent-Type: application/json`
  }
  if (requestMethod.value === 'POST') {
    return 'Content-Type: application/json'
  }
  return null
})

const requestHeadersJson = computed(() => {
  const headers = { 'Content-Type': 'application/json' }
  if (apiType.value === 'push' && requestMethod.value === 'POST' && tokenPosition.value === 'header') {
    headers['Authorization'] = `Bearer ${currentEndpoint.value?.token || 'your_token'}`
  }
  return JSON.stringify(headers, null, 2)
})

const requestBody = computed(() => {
  if (apiType.value === 'inbound') {
    return inboundBody.value || '{\n  \n}'
  }
  if (requestMethod.value === 'GET') return null
  
  const body = {
    title: form.title,
    content: form.content,
    type: form.type,
  }
  return JSON.stringify(body, null, 2)
})

const curlCommand = computed(() => {
  if (!currentEndpoint.value) return ''
  
  const token = currentEndpoint.value.token
  
  if (apiType.value === 'inbound') {
    let cmd = `curl -X POST`
    cmd += ` \\\n  -H "Content-Type: application/json"`
    cmd += ` \\\n  -d '${inboundBody.value || '{}'}'`
    cmd += ` \\\n  "${requestUrl.value}"`
    return cmd
  }
  
  let cmd = `curl -X ${requestMethod.value}`
  
  if (requestMethod.value === 'POST') {
    cmd += ` \\\n  -H "Content-Type: application/json"`
    
    if (tokenPosition.value === 'header') {
      cmd += ` \\\n  -H "Authorization: Bearer ${token}"`
    }
    
    cmd += ` \\\n  -d '${requestBody.value}'`
  }
  
  cmd += ` \\\n  "${requestUrl.value}"`
  
  return cmd
})

const channelResults = computed(() => {
  if (!response.value?.data?.results) return []
  return response.value.data.results
})

const loadEndpoints = async () => {
  try {
    const res = await getEndpoints()
    if (res.success) {
      endpoints.value = res.data || []
    }
  } catch (error) {
    console.error('加载接口列表失败:', error)
  }
}

const handleEndpointChange = () => {
  response.value = null
  // 如果选择的接口不支持入站，切换到标准推送
  if (apiType.value === 'inbound' && !canUseInbound.value) {
    apiType.value = 'push'
  }
}

const handleTest = async () => {
  if (!canSubmit.value) return
  
  loading.value = true
  response.value = null
  
  try {
    const baseUrl = settingsStore.isProxyEnabled 
      ? settingsStore.proxyUrl.trim().replace(/\/$/, '')
      : window.location.origin
    const token = currentEndpoint.value.token
    
    let res
    if (requestMethod.value === 'GET') {
      res = await axios.get(requestUrl.value)
    } else {
      const url = tokenPosition.value === 'url' 
        ? `${baseUrl}/api/push/${token}`
        : `${baseUrl}/api/push/`
      
      const headers = {}
      if (tokenPosition.value === 'header') {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      res = await axios.post(url, {
        title: form.title,
        content: form.content,
        type: form.type,
      }, { headers })
    }
    
    response.value = res.data
    
    if (res.data.success) {
      ElMessage.success('推送成功')
    } else {
      ElMessage.warning(res.data.message || '部分推送失败')
    }
  } catch (error) {
    console.error('请求失败:', error)
    response.value = {
      success: false,
      code: error.response?.status || 500,
      message: error.response?.data?.message || error.message || '请求失败',
      data: error.response?.data,
    }
    ElMessage.error(error.response?.data?.message || '请求失败')
  } finally {
    loading.value = false
  }
}

const handleInboundTest = async () => {
  if (!canSubmitInbound.value) return
  
  loading.value = true
  response.value = null
  
  try {
    let testData
    try {
      testData = JSON.parse(inboundBody.value)
    } catch (e) {
      ElMessage.error('JSON 格式错误')
      loading.value = false
      return
    }
    
    const res = await axios.post(requestUrl.value, testData, {
      headers: { 'Content-Type': 'application/json' }
    })
    
    response.value = res.data
    
    if (res.data.success) {
      ElMessage.success('推送成功')
    } else {
      ElMessage.warning(res.data.message || '部分推送失败')
    }
  } catch (error) {
    console.error('请求失败:', error)
    response.value = {
      success: false,
      code: error.response?.status || 500,
      message: error.response?.data?.message || error.message || '请求失败',
      data: error.response?.data,
    }
    ElMessage.error(error.response?.data?.message || '请求失败')
  } finally {
    loading.value = false
  }
}

const fillExample = (type) => {
  const examples = {
    text: {
      title: '文本消息测试',
      content: '这是一条纯文本测试消息，来自接口调试工具。\n\n发送时间：' + new Date().toLocaleString(),
      type: 'text',
    },
    markdown: {
      title: 'Markdown 测试',
      content: '# 标题\n\n**粗体文字** 和 *斜体文字*\n\n- 列表项 1\n- 列表项 2\n\n[链接](https://example.com)\n\n> 引用文本',
      type: 'markdown',
    },
    html: {
      title: 'HTML 测试',
      content: '<h3>HTML 消息</h3>\n<p>这是 <strong>粗体</strong> 和 <em>斜体</em> 文字</p>\n<ul>\n  <li>项目 1</li>\n  <li>项目 2</li>\n</ul>',
      type: 'html',
    },
  }
  
  const example = examples[type]
  form.title = example.title
  form.content = example.content
  form.type = example.type
}

const clearForm = () => {
  form.title = ''
  form.content = ''
  form.type = 'text'
  response.value = null
}

const fillInboundExample = (type) => {
  const examples = {
    grafana: {
      alerts: [{
        status: 'firing',
        labels: { alertname: 'HighMemoryUsage', severity: 'warning' },
        annotations: { 
          message: '内存使用率超过 90%，当前值：92%', 
          summary: '服务器内存告警' 
        },
        startsAt: new Date().toISOString(),
      }]
    },
    prometheus: {
      alerts: [{
        status: 'firing',
        labels: { alertname: 'InstanceDown', instance: 'localhost:9090' },
        annotations: { 
          description: '实例 localhost:9090 已经宕机超过 5 分钟',
          summary: '实例下线告警'
        },
      }]
    },
    generic: {
      event: 'test',
      message: '这是一条测试消息',
      timestamp: new Date().toISOString(),
    },
  }
  
  inboundBody.value = JSON.stringify(examples[type], null, 2)
}

const clearInboundForm = () => {
  inboundBody.value = ''
  response.value = null
}

const copyCurl = () => {
  navigator.clipboard.writeText(curlCommand.value)
  ElMessage.success('cURL 命令已复制')
}

const copyHeaders = () => {
  const text = headerFormat.value === 'json' ? requestHeadersJson.value : requestHeaders.value
  navigator.clipboard.writeText(text)
  ElMessage.success('请求头已复制')
}

const copyBody = () => {
  navigator.clipboard.writeText(requestBody.value)
  ElMessage.success('请求体已复制')
}

onMounted(() => {
  loadEndpoints()
})
</script>
