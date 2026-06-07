<template>
  <section :id="id" class="relative py-20 md:py-28 bg-gradient-to-b from-[#1a1035] to-[#0F0F1A]">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Title -->
      <div class="text-center mb-16 animate-reveal">
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
          持续迭代，不断进化
        </h2>
        <p class="text-lg text-slate-400 max-w-2xl mx-auto">
          活跃的开源项目，持续添加新渠道和功能改进
        </p>
      </div>

      <!-- Timeline -->
      <div class="relative">
        <!-- Vertical line -->
        <div class="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/50 via-violet-500/30 to-transparent" />

        <!-- Changelog items -->
        <div class="space-y-10">
          <div
            v-for="(item, index) in changelog"
            :key="item.version"
            class="relative pl-12 md:pl-20 animate-reveal"
            style="transition-delay: `${index * 120}ms`;"
          >
            <!-- Dot -->
            <div
              :class="[
                'absolute left-2.5 md:left-6.5 top-1.5 w-3 h-3 rounded-full ring-4',
                index === 0
                  ? 'bg-purple-500 ring-purple-500/20 shadow-lg shadow-purple-500/30'
                  : 'bg-slate-600 ring-slate-800'
              ]"
            />

            <!-- Card -->
            <div
              :class="[
                'rounded-xl p-6 border transition-all duration-300 hover:-translate-y-0.5',
                index === 0
                  ? 'bg-gradient-to-br from-purple-500/15 to-blue-500/5 border-purple-500/30 shadow-lg shadow-purple-500/5'
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/12'
              ]"
            >
              <!-- Header -->
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                <span
                  :class="[
                    'inline-flex items-center gap-2 text-base font-bold',
                    index === 0 ? 'gradient-text' : 'text-white'
                  ]"
                >
                  v{{ item.version }}
                  <span
                    v-if="index === 0"
                    class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/20"
                  >
                    最新
                  </span>
                </span>
                <time class="text-sm text-slate-500">{{ item.date }}</time>
              </div>

              <!-- Changes list -->
              <ul class="space-y-2">
                <li
                  v-for="(change, cIndex) in item.changes"
                  :key="cIndex"
                  class="flex items-start gap-2 text-sm"
                >
                  <svg
                    class="w-4 h-4 mt-0.5 shrink-0"
                    :class="index === 0 ? 'text-purple-400' : 'text-slate-500'"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                  <span :class="index === 0 ? 'text-slate-200' : 'text-slate-400'">{{ change }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Link to full changelog -->
      <div class="mt-12 text-center animate-reveal" style="transition-delay: 600ms;">
        <a
          href="https://github.com/magiccode1412/magicpush/blob/dev/docs/CHANGELOG.md"
          target="_blank"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-slate-400 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 hover:text-white transition-all group"
        >
          查看完整更新日志
          <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { changelog } from '../../data/changelog'

defineProps({
  id: { type: String, default: '' }
})
</script>
