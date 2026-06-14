<template>
  <section class="relative min-h-screen flex items-center justify-center hero-bg grid-pattern pt-20">
    <!-- Gradient orbs -->
    <div class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-float" />
    <div class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[100px] animate-float-delayed" />
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[80px]" />

    <!-- Content -->
    <div class="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6">
      <!-- Badge -->
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8 animate-fade-in-up">
        <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
        <span class="text-sm font-medium text-purple-300">v1.12.0 已发布</span>
      </div>

      <!-- Title -->
      <h1
        class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 animate-fade-in-up"
        style="animation-delay: 100ms;"
      >
        <span class="gradient-text">MagicPush</span>
      </h1>

      <h2 class="text-xl md:text-2xl font-medium text-white/90 mb-6 animate-fade-in-up" style="animation-delay: 200ms;">
        魔法推送
      </h2>

      <!-- Description -->
      <p class="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style="animation-delay: 300ms;">
        支持多种消息渠道的推送服务管理平台，通过标准化的 REST API 接口<br class="hidden sm:block" />
        将消息一键推送到微信、Telegram、飞书、钉钉、邮件等 <span class="text-white font-semibold">20+</span> 个通知渠道
      </p>

      <!-- CTA Buttons -->
      <div class="flex flex-wrap items-center justify-center gap-4 animate-fade-in-up" style="animation-delay: 400ms;">
        <a href="#deploy" class="btn-primary">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          快速开始部署
        </a>
        <a
          href="https://uptimeflare-ept.pages.dev/"
          target="_blank"
          class="btn-outline"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          体验在线 Demo
        </a>
        <a
          href="https://github.com/magiccode1412/magicpush"
          target="_blank"
          class="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5 group"
        >
          <svg class="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        </a>
      </div>

      <!-- Stats -->
      <div class="flex items-center justify-center gap-8 mt-14 animate-fade-in-up" style="animation-delay: 500ms;">
        <div class="text-center">
          <div class="text-2xl md:text-3xl font-bold text-white">23+</div>
          <div class="text-xs text-slate-500 mt-1">消息渠道</div>
        </div>
        <div class="w-px h-10 bg-white/10" />
        <div class="text-center">
          <div class="text-2xl md:text-3xl font-bold text-white">SSG</div>
          <div class="text-xs text-slate-500 mt-1">静态生成</div>
        </div>
        <div class="w-px h-10 bg-white/10" />
        <div class="text-center">
          <div class="text-2xl md:text-3xl font-bold text-white">MIT</div>
          <div class="text-xs text-slate-500 mt-1">开源协议</div>
        </div>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-gentle">
      <svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
      </svg>
    </div>
  </section>
</template>
