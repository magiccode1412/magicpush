<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">推送记录</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">查看所有推送消息的历史记录</p>
      </div>
      <el-button type="danger" plain @click="handleClear">
        <Trash2 class="w-4 h-4 mr-1" />
        清空记录
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <p class="text-sm text-gray-500 dark:text-gray-400">总推送数</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ stats.total || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <p class="text-sm text-gray-500 dark:text-gray-400">成功</p>
        <p class="text-2xl font-bold text-green-600 mt-1">{{ stats.success || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <p class="text-sm text-gray-500 dark:text-gray-400">失败</p>
        <p class="text-2xl font-bold text-red-600 mt-1">{{ stats.failed || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <p class="text-sm text-gray-500 dark:text-gray-400">今日推送</p>
        <p class="text-2xl font-bold text-blue-600 mt-1">{{ stats.today || 0 }}</p>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex flex-wrap gap-4">
        <el-select v-model="filter.status" placeholder="状态" clearable class="w-32">
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
        </el-select>
        
        <el-select v-model="filter.channelType" placeholder="渠道类型" clearable class="w-40">
          <el-option
            v-for="ct in channelTypes"
            :key="ct.type"
            :label="ct.name"
            :value="ct.type"
          />
        </el-select>

        <el-date-picker
          v-model="filter.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
        />

        <el-button type="primary" @click="handleFilter">
          <Search class="w-4 h-4 mr-1" />
          筛选
        </el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <!-- 记录列表 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <el-table :data="logs" v-loading="loading" stripe class="cursor-pointer" @row-click="showDetail">
        <el-table-column label="消息" min-width="200">
          <template #default="{ row }">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ row.title || '无标题' }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{{ row.content }}</p>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="接口" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.endpoint_name" size="small" effect="plain">
              {{ row.endpoint_name }}
            </el-tag>
            <span v-else class="text-gray-400">-</span>
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
            <el-tag v-if="row.status === 'skipped_dnd'" type="info" size="small">已静默</el-tag>
            <el-tag v-else :type="row.status === 'success' ? 'success' : 'danger'" size="small">
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

      <!-- 分页 -->
      <div class="flex justify-center p-4 border-t border-gray-100 dark:border-gray-700">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="推送详情" width="600px">
      <div v-if="selectedLog" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">状态</p>
            <el-tag :type="selectedLog.status === 'success' ? 'success' : 'danger'" class="mt-1">
              {{ selectedLog.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">渠道</p>
            <p class="font-medium">{{ getChannelTypeName(selectedLog.channel_type) || '-' }}</p>
          </div>
          <div v-if="selectedLog.endpoint_name">
            <p class="text-sm text-gray-500 dark:text-gray-400">接口</p>
            <p class="font-medium">{{ selectedLog.endpoint_name }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">消息类型</p>
            <p class="font-medium">{{ selectedLog.message_type }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">发送时间</p>
            <p class="font-medium">{{ formatDate(selectedLog.created_at) }}</p>
          </div>
          <div v-if="selectedLog.ip">
            <p class="text-sm text-gray-500 dark:text-gray-400">请求IP</p>
            <p class="font-medium font-mono text-sm">{{ selectedLog.ip }}</p>
          </div>
        </div>

        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">标题</p>
          <p class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">{{ selectedLog.title || '无标题' }}</p>
        </div>

        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">内容</p>
          <pre class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm whitespace-pre-wrap">{{ selectedLog.content }}</pre>
        </div>

        <div v-if="selectedLog.error_message">
          <p class="text-sm text-red-500 mb-1">错误信息</p>
          <p class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {{ selectedLog.error_message }}
          </p>
        </div>

        <div v-if="selectedLog.response">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">响应数据</p>
          <pre class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs overflow-x-auto">{{ JSON.stringify(JSON.parse(selectedLog.response), null, 2) }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getLogs, getStats, clearLogs } from '@/api/log'
import { getChannelTypes } from '@/api/channel'
import { Search, Trash2 } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()

const logs = ref([])
const stats = ref({})
const loading = ref(false)
const showDetailDialog = ref(false)
const selectedLog = ref(null)
const channelTypes = ref([])

const filter = reactive({
  status: '',
  channelType: '',
  dateRange: null,
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const getChannelTypeName = (type) => {
  const found = channelTypes.value.find((ct) => ct.type === type)
  return found ? found.name : type
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }

    if (filter.status) {
      params.status = filter.status
    }

    if (filter.channelType) {
      params.channelType = filter.channelType
    }

    if (filter.dateRange && filter.dateRange.length === 2) {
      params.startDate = filter.dateRange[0]
      params.endDate = filter.dateRange[1]
    }

    const [logsRes, statsRes, typesRes] = await Promise.all([
      getLogs(params),
      getStats(),
      getChannelTypes(),
    ])

    if (logsRes.success) {
      logs.value = logsRes.data.list || []
      pagination.total = logsRes.data.pagination.total
    }

    if (statsRes.success) {
      stats.value = statsRes.data
    }

    if (typesRes.success) {
      channelTypes.value = typesRes.data || []
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const openLogFromQuery = () => {
  const logId = route.query.logId
  if (!logId) return
  const target = logs.value.find((l) => l.id == logId)
  if (target) {
    selectedLog.value = target
    showDetailDialog.value = true
  }
}

const handleFilter = () => {
  pagination.page = 1
  loadData()
}

const resetFilter = () => {
  filter.status = ''
  filter.channelType = ''
  filter.dateRange = null
  pagination.page = 1
  loadData()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

const handlePageChange = (page) => {
  pagination.page = page
  loadData()
}

const showDetail = (row) => {
  selectedLog.value = row
  showDetailDialog.value = true
}

const handleClear = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有推送记录吗？此操作不可恢复！',
      '确认清空',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const res = await clearLogs()
    if (res.success) {
      ElMessage.success(`已清空 ${res.data.deleted} 条推送记录`)
      loadData()
    } else {
      ElMessage.error(res.message || '清空失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空记录失败:', error)
      ElMessage.error('清空记录失败')
    }
  }
}

onMounted(async () => {
  await loadData()
  openLogFromQuery()
})
</script>
