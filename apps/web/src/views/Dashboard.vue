<template>
  <div class="space-y-6 animate-fade-in">
    <!-- 欢迎语 -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
        欢迎回来，<span class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{{ authStore.user?.username }}</span>
      </h2>
      <p class="text-gray-500 dark:text-gray-400 mt-1">
        这里是您的推送服务仪表板
      </p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">推送接口</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stats.endpointCount || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Link class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">消息渠道</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stats.channelCount || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Share2 class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">今日推送</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stats.todayPushCount || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Send class="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">总推送数</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stats.totalPushCount || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <BarChart3 class="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">快捷操作</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <router-link
          v-for="action in quickActions"
          :key="action.name"
          :to="action.path"
          class="flex flex-col items-center p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
        >
          <div class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center mb-3 transition-colors">
            <component :is="action.icon" class="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </div>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ action.name }}</span>
        </router-link>
      </div>
    </div>

    <!-- 最近推送记录 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">最近推送记录</h3>
        <router-link to="/logs" class="text-sm text-blue-600 hover:text-blue-500">
          查看全部
        </router-link>
      </div>
      <el-table :data="recentLogs" style="width: 100%" @row-click="goToLogDetail" class="cursor-pointer">
        <el-table-column label="消息" min-width="200">
          <template #default="{ row }">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ row.title || '无标题' }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{{ row.content }}</p>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="渠道" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.channel_type" size="small" effect="plain">
              {{ getChannelTypeName(row.channel_type) }}
            </el-tag>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>

        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ row.message_type === 'markdown' ? 'Markdown' : row.message_type === 'html' ? 'HTML' : '文本' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="请求IP" width="150">
          <template #default="{ row }">
            <span class="text-sm text-gray-600 dark:text-gray-400 font-mono">
              {{ row.ip || '-' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ formatDate(row.created_at) }}
            </span>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="recentLogs.length === 0" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
        暂无推送记录
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUserStats } from '@/api/user'
import { getLogs } from '@/api/log'
import { getChannelTypes } from '@/api/channel'
import {
  Link,
  Share2,
  Send,
  BarChart3,
  PlusCircle,
  MessageSquare,
  Settings,
  FileText,
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const stats = ref({})
const recentLogs = ref([])
const channelTypes = ref([])

const quickActions = [
  { name: '新建接口', icon: PlusCircle, path: '/endpoints' },
  { name: '绑定渠道', icon: MessageSquare, path: '/channels' },
  { name: '推送记录', icon: FileText, path: '/logs' },
  { name: '系统设置', icon: Settings, path: '/settings' },
]

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const getChannelTypeName = (type) => {
  const found = channelTypes.value.find((ct) => ct.type === type)
  return found ? found.name : type
}

const goToLogDetail = (row) => {
  router.push({ name: 'Logs', query: { logId: row.id } })
}

const loadData = async () => {
  try {
    const [statsRes, logsRes, typesRes] = await Promise.all([
      getUserStats(),
      getLogs({ pageSize: 5 }),
      getChannelTypes(),
    ])
    if (statsRes.success) {
      stats.value = statsRes.data
    }
    if (logsRes.success) {
      recentLogs.value = logsRes.data.list || []
    }
    if (typesRes.success) {
      channelTypes.value = typesRes.data || []
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

onMounted(() => {
  loadData()
})
</script>
