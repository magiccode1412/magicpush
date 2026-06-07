<template>
  <section class="relative py-20 md:py-28 bg-[#0F0F1A] overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0" style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0); background-size: 32px 32px;" />

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Title -->
      <div class="text-center mb-16 animate-reveal">
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
          现代化技术栈
        </h2>
        <p class="text-lg text-slate-400 max-w-2xl mx-auto">
          基于成熟的 Node.js 与 Vue 3 技术体系，稳定可靠，易于二次开发
        </p>
      </div>

      <!-- Tech Stack Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <!-- Backend -->
        <div class="animate-reveal glass-card p-8" style="transition-delay: 100ms;">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
              <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-white">后端技术</h3>
              <p class="text-xs text-slate-500">Backend Stack</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="tech in techStack.backend"
              :key="tech.name"
              class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/12 transition-all"
            >
              <span class="text-slate-400">{{ tech.name }}</span>
            </div>
          </div>
        </div>

        <!-- Frontend -->
        <div class="animate-reveal glass-card p-8" style="transition-delay: 250ms;">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-white">前端技术</h3>
              <p class="text-xs text-slate-500">Frontend Stack</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="tech in techStack.frontend"
              :key="tech.name"
              class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/12 transition-all"
            >
              <span class="text-slate-400">{{ tech.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Docker & Deployment -->
      <div
        class="mt-8 animate-reveal glass-card p-8 flex flex-col md:flex-row items-center gap-6"
        style="transition-delay: 400ms;"
      >
        <div class="flex items-center gap-4 shrink-0">
          <svg class="w-12 h-12 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185zm-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.186zm0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186zm0 2.714h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185zm-2.93-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185H8.099a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.186zm0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185H8.099a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186zm0 2.714h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186H8.099a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185zM5.168 5.648h2.119a.186.186 0 00.185-.186V3.574a.186.186 0 00-.185-.185H5.168a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.186zm0 2.716h2.119a.187.187 0 00.185-.186V6.29a.186.186 0 00-.185-.185H5.168a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186zm0 2.714h2.119a.186.186 0 00.185-.185V9.006a.186.186 0 00-.185-.186H5.168a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185zm11.853 2.715h2.119a.186.186 0 00.185-.185V9.007a.186.186 0 00-.185-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .101.083.184.185.185zM23.763 9.89c-.065-.052-1.645-1.338-4.792-.993l.228-1.07c2.77-.298 4.156.553 4.214.59l.35.52z"/><path d="M23.464 8.91l.35.52-.35-.52z"/>
            <path d="M.236 9.89l.349-.52c.059-.037 1.444-.889 4.215-.59L5.03 8.89C1.882 8.552.302 9.838.236 9.89z"/>
          </svg>
          <div>
            <h4 class="font-bold text-white">Docker 支持</h4>
            <p class="text-xs text-slate-500">预构建镜像，一键部署</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 justify-center md:justify-start">
          <span class="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">amd64</span>
          <span class="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/10 text-green-300 border border-green-500/20">arm64 / armv8</span>
          <span class="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">All-in-One 镜像</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { techStack } from '../../data/deploy'
</script>
