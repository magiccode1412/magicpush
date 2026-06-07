<template>
  <section class="relative py-20 md:py-28 bg-[#0F0F1A] overflow-hidden">
    <!-- Subtle grid background -->
    <div class="absolute inset-0 opacity-30" style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0); background-size: 40px 40px;" />

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Title -->
      <div class="text-center mb-16 animate-reveal">
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
          掌控你的消息推送架构
        </h2>
        <p class="text-lg text-slate-400 max-w-2xl mx-auto">
          从传统一对一到自建中转服务，三种消息推送架构的演进对比
        </p>
      </div>

      <!-- Architecture Images -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        <!-- Image 1: One to One -->
        <div
          class="animate-reveal group"
          style="transition-delay: 100ms;"
        >
          <div class="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-[#13132b] p-4 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5">
            <div class="absolute top-6 left-6 z-10">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/20">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                传统方式
              </span>
            </div>
            <img
              src="/image/magicpush01.png"
              alt="一对一消息推送方式 - 每个应用只能对接一个渠道，耦合度高"
              class="w-full h-auto rounded-lg mt-8 opacity-80 group-hover:opacity-100 transition-opacity duration-300"
              loading="lazy"
            />
            <p class="mt-4 text-sm text-slate-400 text-center">一对一推送 — 耦合度高，扩展困难</p>
          </div>
        </div>

        <!-- Image 2: Many to One -->
        <div
          class="animate-reveal group"
          style="transition-delay: 250ms;"
        >
          <div class="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-[#13132b] p-4 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5">
            <div class="absolute top-6 left-6 z-10">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/20">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                第三方中转
              </span>
            </div>
            <img
              src="/image/magicpush02.png"
              alt="多对一推送服务 - 依赖第三方平台，存在单点故障风险"
              class="w-full h-auto rounded-lg mt-8 opacity-80 group-hover:opacity-100 transition-opacity duration-300"
              loading="lazy"
            />
            <p class="mt-4 text-sm text-slate-400 text-center">第三方中转 — 单点故障，不可控</p>
          </div>
        </div>

        <!-- Image 3: Self-hosted -->
        <div
          class="animate-reveal group"
          style="transition-delay: 400ms;"
        >
          <div class="relative rounded-2xl overflow-hidden border border-purple-500/20 bg-[#13132b] p-4 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/15">
            <div class="absolute top-6 left-6 z-10">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/20">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                推荐方案
              </span>
            </div>
            <img
              src="/image/magicpush03.png"
              alt="使用自己的推送服务 MagicPush - 自主可控，多渠道统一管理"
              class="w-full h-auto rounded-lg mt-8 ring-2 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all duration-300"
              loading="lazy"
            />
            <p class="mt-4 text-sm text-purple-300 text-center font-medium">MagicPush 自建 — 自主可控，多渠道覆盖</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
