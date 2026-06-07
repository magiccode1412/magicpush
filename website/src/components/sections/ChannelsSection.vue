<template>
  <section class="relative py-20 md:py-28 bg-gradient-to-b from-[#0F0F1A] to-[#1a1035] overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px]" />
    <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Title -->
      <div class="text-center mb-16 animate-reveal">
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
          22+ 消息渠道，一站式全覆盖
        </h2>
        <p class="text-lg text-slate-400 max-w-2xl mx-auto">
          覆盖微信生态、即时通讯、邮件推送、自建服务等多个领域
        </p>
      </div>

      <!-- Channels by Category -->
      <div v-for="category in channelCategories" :key="category" class="mb-10 animate-reveal">
        <div class="flex items-center gap-2 mb-4">
          <span :class="['w-2.5 h-2.5 rounded-full', getCategoryColor(category)]" />
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500">{{ category }}</h3>
          <span class="text-xs text-slate-600">({{ getChannelsInCategory(category).length }})</span>
        </div>
        <div class="flex flex-wrap gap-3">
          <ChannelCard
            v-for="channel in getChannelsInCategory(category)"
            :key="channel.name"
            :name="channel.name"
            :category="channel.category"
            :description="channel.description"
          />
        </div>
      </div>

      <!-- Channel count badge -->
      <div class="mt-12 flex justify-center animate-reveal" style="transition-delay: 300ms;">
        <div class="inline-flex items-center gap-6 px-8 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
          <div class="text-center">
            <div class="text-3xl font-bold gradient-text">22+</div>
            <div class="text-xs text-slate-500 mt-1">消息渠道</div>
          </div>
          <div class="w-px h-12 bg-white/10" />
          <div class="text-center">
            <div class="text-3xl font-bold text-white">9</div>
            <div class="text-xs text-slate-500 mt-1">微信生态</div>
          </div>
          <div class="w-px h-12 bg-white/10" />
          <div class="text-center">
            <div class="text-3xl font-bold text-white">4</div>
            <div class="text-xs text-slate-500 mt-1">即时通讯</div>
          </div>
          <div class="w-px h-12 bg-white/10" />
          <div class="text-center">
            <div class="text-3xl font-bold text-white">5</div>
            <div class="text-xs text-slate-500 mt-1">邮件与推送</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { channels, channelCategories as allCategories } from '../../data/channels'
import ChannelCard from '../ui/ChannelCard.vue'

const channelCategories = allCategories

function getChannelsInCategory(category) {
  return channels.filter(c => c.category === category)
}

function getCategoryColor(category) {
  const colors = {
    '微信生态': 'bg-green-400',
    '即时通讯': 'bg-blue-400',
    '邮件与推送': 'bg-orange-400',
    '通用/自托管': 'bg-violet-400'
  }
  return colors[category] || 'bg-slate-400'
}
</script>
