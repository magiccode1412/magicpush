<template>
  <section :id="id" class="relative py-20 md:py-28 bg-[#F8FAFC]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Title -->
      <div class="text-center mb-16 animate-reveal">
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 gradient-text">
          强大的功能特性
        </h2>
        <p class="text-lg text-slate-500 max-w-2xl mx-auto">
          从多渠道推送到安全防护，MagicPush 提供企业级消息管理所需的一切能力
        </p>
      </div>

      <!-- Feature Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
        <FeatureCard
          v-for="(feature, index) in features"
          :key="feature.name"
          :name="feature.name"
          :icon="feature.icon"
          :description="feature.description"
          class="animate-reveal"
          :style="{ transitionDelay: `${index * 100}ms` }"
        />
      </div>

      <!-- Security Features Highlight -->
      <div
        class="mt-10 p-6 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 animate-reveal"
        style="transition-delay: 600ms;"
      >
        <div class="flex flex-col md:flex-row items-center gap-4">
          <div class="flex items-center gap-3 shrink-0">
            <div class="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <div>
              <h4 class="font-bold text-slate-900">三层限流安全防护</h4>
              <p class="text-xs text-slate-500">Nginx + Express 全局 + 接口级三重保护</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 justify-center md:justify-end">
            <span v-for="sf in securityFeatures" :key="sf.name" class="px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-600 border border-slate-200 shadow-sm">{{ sf.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { features as featureData, securityFeatures } from '../../data/features'
import FeatureCard from '../ui/FeatureCard.vue'

defineProps({
  id: { type: String, default: '' }
})

const features = featureData
</script>
