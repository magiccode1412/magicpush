<template>
  <section class="relative bg-[#F8FAFC] py-20 md:py-28">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Title -->
      <div class="text-center mb-16 animate-reveal">
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          为什么需要自建推送服务？
        </h2>
        <p class="text-lg text-slate-500 max-w-2xl mx-auto">
          市面上的推送方案各有局限，拥有自己的中转服务才能真正掌握消息的主动权
        </p>
      </div>

      <!-- Pain Point Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        <!-- Card 1 -->
        <div
          class="animate-reveal group relative p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
          style="transition-delay: 100ms;"
        >
          <div class="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center mb-6">
            <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-3">Telegram 需要魔法？</h3>
          <p class="text-sm text-slate-500 leading-relaxed mb-4">
            Telegram 虽然是最优秀的消息推送服务，但需要特殊网络环境才能访问。国内使用存在天然障碍。
          </p>
          <div class="flex items-center gap-2 text-xs font-medium text-red-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            网络受限，无法直接访问
          </div>
        </div>

        <!-- Card 2 -->
        <div
          class="animate-reveal group relative p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
          style="transition-delay: 250ms;"
        >
          <div class="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center mb-6">
            <svg class="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-3">企业通讯仅限内部</h3>
          <p class="text-sm text-slate-500 leading-relaxed mb-4">
            企业微信、钉钉、飞书等平台的消息推送被限制在组织内部，无法向外部用户发送通知。
          </p>
          <div class="flex items-center gap-2 text-xs font-medium text-amber-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            仅限企业/组织内部成员
          </div>
        </div>

        <!-- Card 3 -->
        <div
          class="animate-reveal group relative p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
          style="transition-delay: 400ms;"
        >
          <div class="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
            <svg class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-3">第三方服务宕机风险</h3>
          <p class="text-sm text-slate-500 leading-relaxed mb-4">
            依赖第三方推送服务意味着一旦对方停止运营或宕机，所有调用代码和令牌都需要紧急更换。
          </p>
          <div class="flex items-center gap-2 text-xs font-medium text-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            单点故障，不可控风险高
          </div>
        </div>
      </div>

      <!-- Solution CTA -->
      <div class="mt-16 text-center animate-reveal">
        <div class="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-purple-50 border border-purple-100">
          <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <span class="text-sm font-medium text-purple-700">
            使用 MagicPush 自建中转服务，一次接入多渠道，数据完全自主可控
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
