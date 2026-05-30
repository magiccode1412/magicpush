<template>
  <div
    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
           bg-white/[0.04] border border-white/[0.06]
           hover:bg-purple-500/10 hover:border-purple-500/20
           transition-all duration-200 hover:-translate-y-0.5 cursor-default"
    :title="description"
  >
    <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="categoryColor" />
    <span class="text-sm font-medium text-slate-300 group-hover:text-white">{{ name }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' }
})

const categoryColors = {
  '微信生态': 'bg-green-400',
  '即时通讯': 'bg-blue-400',
  '邮件与推送': 'bg-orange-400',
  '通用/自托管': 'bg-violet-400'
}

const categoryColor = computed(() => categoryColors[props.category] || 'bg-slate-400')
</script>
