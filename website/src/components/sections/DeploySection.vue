<template>
  <section :id="id" class="relative py-20 md:py-28 bg-[#F8FAFC]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Title -->
      <div class="text-center mb-16 animate-reveal">
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          一键部署，即刻使用
        </h2>
        <p class="text-lg text-slate-500 max-w-2xl mx-auto">
          多种部署方式可选，从 Docker 一行命令到云平台一键托管，总有一种适合你
        </p>
      </div>

      <!-- Tab Navigation -->
      <div class="flex flex-wrap justify-center gap-2 mb-10 animate-reveal" style="transition-delay: 100ms;">
        <button
          v-for="method in deployMethods"
          :key="method.id"
          @click="activeTab = method.id"
          :class="[
            'px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
            activeTab === method.id
              ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          ]"
        >
          {{ method.title }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="max-w-4xl mx-auto">
        <Transition
          mode="out-in"
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-4"
        >
          <!-- Docker Tab -->
          <div v-if="activeMethod" :key="activeMethod.id">
            <div class="glass-card p-6 md:p-8 bg-white border border-slate-200">
              <h3 class="text-xl font-bold text-slate-900 mb-2">{{ activeMethod.title }}</h3>
              <p class="text-sm text-slate-500 mb-6">{{ activeMethod.subtitle }}</p>

              <!-- Code Block -->
              <div class="code-slot mb-6">
                <CodeBlock :language="activeMethod.id === 'railway' ? 'bash' : 'yaml'">
{{ activeMethod.code }}
                </CodeBlock>
              </div>

              <!-- Steps -->
              <ol class="space-y-3 mb-6">
                <li
                  v-for="(step, index) in activeMethod.steps"
                  :key="index"
                  class="flex items-start gap-3"
                >
                  <span class="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold shrink-0 mt-0.5">
                    {{ index + 1 }}
                  </span>
                  <span class="text-sm text-slate-600">{{ step }}</span>
                </li>
              </ol>

              <!-- Note -->
              <p class="text-xs text-slate-400 flex items-start gap-2">
                <svg class="w-4 h-4 shrink-0 mt-0.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ activeMethod.note }}
              </p>

              <!-- Railway deploy button -->
              <div v-if="activeMethod.hasDeployButton" class="mt-6">
                <a href="https://railway.com/deploy/JbNI4y?referralCode=85Y1W5&utm_medium=integration&utm_source=template&utm_campaign=generic" target="_blank" rel="noopener noreferrer">
                  <img
                    src="/image/deploy_on_railway.svg"
                    alt="Deploy on Railway"
                    class="rounded-xl border border-slate-200 hover:shadow-lg transition-shadow cursor-pointer"
                    loading="lazy"
                  />
                </a>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { deployMethods } from '../../data/deploy'
import CodeBlock from '../ui/CodeBlock.vue'

defineProps({
  id: { type: String, default: '' }
})

const activeTab = ref('docker')
const activeMethod = computed(() => deployMethods.find(m => m.id === activeTab.value))
</script>
