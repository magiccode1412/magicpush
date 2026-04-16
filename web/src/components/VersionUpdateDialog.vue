<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="版本更新"
    width="520px"
    :close-on-click-modal="false"
    class="version-update-dialog"
  >
    <div class="version-update-content">
      <!-- 版本号展示 -->
      <div class="version-header">
        <div class="version-badge">
          <img src="/favicon.png" alt="MagicPush Logo" />
        </div>
        <div class="version-info">
          <h3 class="version-title">{{ displayName }}</h3>
          <p class="version-subtitle">快来看看更新了什么吧！</p>
        </div>
      </div>

      <!-- 最新更新日志 -->
      <div v-if="latestChangelog" class="changelog-section">
        <h4 class="changelog-label">更新内容</h4>
        <div class="changelog-card">
          <div class="changelog-meta">
            <span class="changelog-version">v{{ latestChangelog.version }}</span>
            <span class="changelog-date">{{ latestChangelog.date }}</span>
          </div>
          <ul class="changelog-list">
            <li
              v-for="(change, index) in latestChangelog.changes"
              :key="index"
              class="changelog-item"
            >
              <span class="change-dot"></span>
              <span>{{ change }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:visible', false)">关闭</el-button>
        <el-button type="primary" @click="handleViewFullLog">
          <FileText class="w-4 h-4 mr-1" />
          查看完整日志
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles, FileText } from 'lucide-vue-next'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  latestChangelog: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:visible'])

const router = useRouter()

const displayName = computed(() => {
  if (!props.latestChangelog) return ''
  return `魔法推送 v${props.latestChangelog.version}`
})

const handleViewFullLog = () => {
  emit('update:visible', false)
  router.push('/changelog')
}
</script>

<style scoped>
.version-update-content {
  padding: 4px 0;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.version-badge {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.version-info {
  flex: 1;
}

.version-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0 0 4px 0;
}

.version-subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.changelog-section {
  margin-top: 8px;
}

.changelog-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 12px 0;
}

.changelog-card {
  background: var(--el-fill-color-lighter, #f8f9fa);
  border-radius: 10px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.changelog-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.changelog-version {
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.1);
}

.changelog-date {
  font-size: 13px;
  color: var(--el-text-color-placeholder, #c0c4cc);
}

.changelog-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.changelog-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.change-dot {
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #3b82f6;
  margin-top: 9px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
