<template>
  <div class="space-y-6 animate-fade-in">
    <!-- 欢迎语 -->
    <div class="fade-in-up">
      <h1 class="font-display text-2xl lg:text-3xl font-bold text-primary mb-2">
        欢迎回来，<span class="text-accent" style="color: var(--accent-primary);">{{ authStore.user?.username || '管理员' }}</span>
      </h1>
      <p class="text-secondary">这里是您的推送服务仪表板</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="stat-card fade-in-up delay-100">
        <div class="flex items-center justify-between mb-4">
          <div class="stat-icon">
            <Link class="w-5 h-5" />
          </div>
          <span class="badge badge-success">+12%</span>
        </div>
        <p class="text-secondary text-sm mb-1">推送接口</p>
        <p class="font-display text-2xl font-bold text-primary">{{ stats.endpointCount || 0 }}</p>
      </div>

      <div class="stat-card fade-in-up delay-200">
        <div class="flex items-center justify-between mb-4">
          <div class="stat-icon">
            <Share2 class="w-5 h-5" />
          </div>
        </div>
        <p class="text-secondary text-sm mb-1">消息渠道</p>
        <p class="font-display text-2xl font-bold text-primary">{{ stats.channelCount || 0 }}</p>
      </div>

      <div class="stat-card fade-in-up delay-300">
        <div class="flex items-center justify-between mb-4">
          <div class="stat-icon">
            <Send class="w-5 h-5" />
          </div>
        </div>
        <p class="text-secondary text-sm mb-1">今日推送</p>
        <p class="font-display text-2xl font-bold text-primary">{{ stats.todayPushCount || 0 }}</p>
      </div>

      <div class="stat-card fade-in-up delay-400">
        <div class="flex items-center justify-between mb-4">
          <div class="stat-icon">
            <BarChart3 class="w-5 h-5" />
          </div>
          <span class="badge badge-success">+28%</span>
        </div>
        <p class="text-secondary text-sm mb-1">总推送数</p>
        <p class="font-display text-2xl font-bold text-primary">{{ stats.totalPushCount || 0 }}</p>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="glass-panel p-6 fade-in-up delay-300">
      <h3 class="font-display text-lg font-semibold text-primary mb-5">快捷操作</h3>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <router-link
          v-for="action in quickActions"
          :key="action.name"
          :to="action.path"
          class="quick-action"
        >
          <div class="quick-action-icon">
            <component :is="action.icon" class="w-6 h-6" />
          </div>
          <span class="text-sm text-primary font-medium">{{ action.name }}</span>
        </router-link>
      </div>
    </div>

    <!-- 最近推送记录 -->
    <div class="glass-card overflow-hidden fade-in-up delay-400">
      <div class="px-6 py-4 border-b flex items-center justify-between" style="border-color: var(--border-subtle);">
        <h3 class="font-display text-lg font-semibold text-primary">最近推送记录</h3>
        <router-link to="/logs" class="text-sm font-medium hover:underline" style="color: var(--accent-primary);">查看全部</router-link>
      </div>

      <div>
        <div
          v-for="log in recentLogs"
          :key="log.id"
          class="log-item"
        >
          <div class="flex items-center gap-4">
            <div :class="['log-indicator', log.status === 'success' ? 'success' : 'error']"></div>
            <div>
              <p class="text-primary font-medium">{{ log.title || '无标题' }}</p>
              <p class="text-xs text-muted">{{ log.channel_type }} · {{ formatDate(log.created_at) }}</p>
            </div>
          </div>
          <el-tag :type="log.status === 'success' ? 'success' : 'danger'" size="small">
            {{ log.status === 'success' ? '成功' : '失败' }}
          </el-tag>
        </div>
        <div v-if="recentLogs.length === 0" class="px-6 py-8 text-center text-muted">
          暂无推送记录
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getUserStats } from '@/api/user'
import { getLogs } from '@/api/log'
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

const authStore = useAuthStore()

const stats = ref({})
const recentLogs = ref([])

const quickActions = [
  { name: '新建接口', icon: PlusCircle, path: '/endpoints' },
  { name: '绑定渠道', icon: MessageSquare, path: '/channels' },
  { name: '推送记录', icon: FileText, path: '/logs' },
  { name: '系统设置', icon: Settings, path: '/settings' },
]

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const loadData = async () => {
  try {
    const statsRes = await getUserStats()
    if (statsRes.success) {
      stats.value = statsRes.data
    }

    const logsRes = await getLogs({ pageSize: 5 })
    if (logsRes.success) {
      recentLogs.value = logsRes.data.list || []
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

onMounted(() => {
  loadData()
})
</script>
