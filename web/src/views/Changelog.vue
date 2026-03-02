<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">更新日志</h1>
      <p class="text-gray-600 dark:text-gray-400">
        当前版本: <span class="font-semibold text-blue-600 dark:text-blue-400">{{ VERSION.version }}</span>
      </p>
    </div>

    <div v-if="changelog.length === 0" class="text-center py-12">
      <FileText class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
      <p class="text-gray-500 dark:text-gray-400">暂无更新日志</p>
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="(item, index) in changelog"
        :key="index"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span
                :class="[
                  'px-2.5 py-1 rounded-full text-xs font-medium',
                  getVersionTypeClass(item.type)
                ]"
              >
                {{ getVersionTypeLabel(item.type) }}
              </span>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                v{{ item.version }}
              </h3>
            </div>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ item.date }}
            </span>
          </div>
        </div>

        <div class="px-6 py-4">
          <ul class="space-y-2">
            <li
              v-for="(change, changeIndex) in item.changes"
              :key="changeIndex"
              class="flex items-start gap-2 text-gray-700 dark:text-gray-300"
            >
              <span class="text-blue-500 dark:text-blue-400 mt-1.5">•</span>
              <span>{{ change }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { VERSION } from '@/utils/version'
import { FileText } from 'lucide-vue-next'

const changelog = ref([])

const getVersionTypeClass = (type) => {
  const classes = {
    release: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    feat: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    fix: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    breaking: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return classes[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
}

const getVersionTypeLabel = (type) => {
  const labels = {
    release: '发布',
    feat: '新功能',
    fix: '修复',
    breaking: '重大变更',
  }
  return labels[type] || type
}

onMounted(async () => {
  try {
    const response = await fetch('/api/version')
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        changelog.value = data.data.changelog || []
      }
    }
  } catch (error) {
    console.error('加载更新日志失败:', error)
  }
})
</script>
