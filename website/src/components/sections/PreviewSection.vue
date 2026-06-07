<template>
  <section class="relative py-20 md:py-28 bg-[#F8FAFC]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Title -->
      <div class="text-center mb-16 animate-reveal">
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          简洁优雅的管理界面
        </h2>
        <p class="text-lg text-slate-500 max-w-2xl mx-auto">
          现代化的 Web 管理后台，支持深浅色主题切换，响应式设计完美适配各种设备
        </p>
      </div>

      <!-- Screenshot Gallery -->
      <div class="relative animate-reveal" style="transition-delay: 200ms;">
        <!-- Gallery container -->
        <div class="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 -mx-4 px-4 sm:mx-0 sm:px-0">
          <!-- Browser mockup for each screenshot -->
          <div
            v-for="(screenshot, index) in screenshots"
            :key="index"
            :id="'slide-' + index"
            class="snap-center shrink-0 w-full md:w-[calc(50%-12px)] lg:w-[calc(40%-18px)] first:ml-4 sm:first:ml-0 last:mr-4 sm:last:mr-0"
          >
            <div
              class="rounded-2xl overflow-hidden bg-white shadow-xl shadow-slate-200/50 border border-slate-200 hover:shadow-2xl transition-shadow duration-500 cursor-pointer"
              @click="currentSlide = index"
            >
              <!-- Browser bar -->
              <div class="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div class="flex gap-1.5">
                  <span class="w-3 h-3 rounded-full bg-red-400" />
                  <span class="w-3 h-3 rounded-full bg-yellow-400" />
                  <span class="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div class="flex-1 flex justify-center">
                  <span class="text-xs text-slate-400 font-mono">magicpush.app</span>
                </div>
              </div>
              <!-- Image -->
              <img
                :src="screenshot.src"
                :alt="screenshot.alt"
                class="w-full h-auto object-cover aspect-[16/10]"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <!-- Navigation dots -->
        <div class="flex items-center justify-center gap-2 mt-6">
          <button
            v-for="(screenshot, index) in screenshots"
            :key="'dot-' + index"
            @click="scrollToSlide(index)"
            :class="[
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              currentSlide === index ? 'bg-purple-500 w-8' : 'bg-slate-300 hover:bg-slate-400'
            ]"
            :aria-label="'切换到截图 ' + (index + 1)"
          />
        </div>
      </div>

      <!-- Feature highlights below gallery -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14 animate-reveal" style="transition-delay: 400ms;">
        <div class="text-center p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
          <div class="text-2xl mb-2">🎨</div>
          <p class="text-sm font-medium text-slate-700">深浅色主题</p>
          <p class="text-xs text-slate-400 mt-1">跟随系统自动切换</p>
        </div>
        <div class="text-center p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
          <div class="text-2xl mb-2">📱</div>
          <p class="text-sm font-medium text-slate-700">响应式设计</p>
          <p class="text-xs text-slate-400 mt-1">完美适配手机平板</p>
        </div>
        <div class="text-center p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
          <div class="text-2xl mb-2">⚡</div>
          <p class="text-sm font-medium text-slate-700">实时推送记录</p>
          <p class="text-xs text-slate-400 mt-1">状态追踪一目了然</p>
        </div>
        <div class="text-center p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
          <div class="text-2xl mb-2">🔐</div>
          <p class="text-sm font-medium text-slate-700">安全认证</p>
          <p class="text-xs text-slate-400 mt-1">JWT 双令牌保护</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const currentSlide = ref(0)

const screenshots = [
  { src: '/image/intro/01.png', alt: 'MagicPush 管理界面概览' },
  { src: '/image/intro/02.png', alt: '渠道配置页面' },
  { src: '/image/intro/03.png', alt: '推送接口管理' },
  { src: '/image/intro/04.png', alt: '推送历史记录' },
  { src: '/image/intro/05.png', alt: '系统设置与安全防护' }
]

function scrollToSlide(index) {
  const el = document.getElementById('slide-' + index)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    currentSlide.value = index
  }
}
</script>
