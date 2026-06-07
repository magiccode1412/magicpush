<template>
  <div class="relative group">
    <div class="flex items-center justify-between px-4 py-2.5 bg-[#16162a] rounded-t-xl border-b border-white/5">
      <span class="text-xs text-slate-500 font-mono">{{ language || 'bash' }}</span>
      <button
        @click="copyCode"
        :class="[
          'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all',
          copied ? 'text-green-400 bg-green-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'
        ]"
      >
        <svg v-if="!copied" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ copied ? '已复制' : '复制' }}
      </button>
    </div>
    <pre
      class="p-5 bg-[#0d0d1a] rounded-b-xl overflow-x-auto text-sm leading-relaxed"
    ><code class="font-mono text-slate-300"><slot /></code></pre>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  language: { type: String, default: 'bash' }
})

const copied = ref(false)

const copyCode = async () => {
  const codeEl = document.querySelector('.code-slot')
  if (codeEl) {
    await navigator.clipboard.writeText(codeEl.textContent)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>
