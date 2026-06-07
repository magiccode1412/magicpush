<template>
  <footer class="relative bg-[#080812] border-t border-white/5">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <!-- Brand -->
        <div class="lg:col-span-1">
          <a href="/" class="flex items-center gap-3 mb-4">
            <img src="/logo.png" alt="MagicPush" class="w-8 h-8 rounded-lg" />
            <span class="text-lg font-bold text-white">MagicPush</span>
          </a>
          <p class="text-sm text-slate-500 leading-relaxed mb-6">
            支持多种消息渠道的推送服务管理平台，通过标准化 REST API 将消息推送到微信、Telegram、飞书、钉钉、邮件等 20+ 通知渠道。
          </p>
          <div class="flex items-center gap-3">
            <a
              href="https://github.com/magiccode1412/magicpush"
              target="_blank"
              class="p-2.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div>
          <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">快速链接</h4>
          <ul class="space-y-3">
            <li><a href="#features" class="text-sm text-slate-500 hover:text-purple-400 transition-colors">功能特性</a></li>
            <li><a href="#deploy" class="text-sm text-slate-500 hover:text-purple-400 transition-colors">部署文档</a></li>
            <li><a href="#changelog" class="text-sm text-slate-500 hover:text-purple-400 transition-colors">更新日志</a></li>
            <li>
              <a href="https://uptimeflare-ept.pages.dev/" target="_blank" class="text-sm text-slate-500 hover:text-purple-400 transition-colors">在线 Demo</a>
            </li>
            <li>
              <a href="https://github.com/magiccode1412/magicpush/issues" target="_blank" class="text-sm text-slate-500 hover:text-purple-400 transition-colors">提交 Issue</a>
            </li>
          </ul>
        </div>

        <!-- Resources -->
        <div>
          <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">资源</h4>
          <ul class="space-y-3">
            <li>
              <a href="https://github.com/magiccode1412/magicpush" target="_blank" class="text-sm text-slate-500 hover:text-purple-400 transition-colors">GitHub 仓库</a>
            </li>
            <li>
              <a href="https://hub.docker.com/r/magiccode1412/magicpush" target="_blank" class="text-sm text-slate-500 hover:text-purple-400 transition-colors">Docker 镜像</a>
            </li>
            <li>
              <a href="https://github.com/magiccode1412/magicpush/blob/dev/docs/documentation/keyword-filter-guide.md" target="_blank" class="text-sm text-slate-500 hover:text-purple-400 transition-colors">关键词过滤指南</a>
            </li>
            <li>
              <a href="https://github.com/magiccode1412/magicpush/blob/dev/docs/documentation/do-not-disturb-guide.md" target="_blank" class="text-sm text-slate-500 hover:text-purple-400 transition-colors">免打扰配置指南</a>
            </li>
          </ul>
        </div>

        <!-- Thanks & License -->
        <div>
          <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">感谢墙</h4>
          <div class="flex flex-wrap gap-3 mb-6">
            <a
              v-for="person in thanks"
              :key="person.name"
              :href="person.link"
              target="_blank"
              class="group flex flex-col items-center gap-1"
            >
              <img
                :src="person.avatar"
                :alt="person.name"
                class="w-10 h-10 rounded-full ring-2 ring-white/10 group-hover:ring-purple-500/50 transition-all"
                loading="lazy"
              />
              <span class="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">{{ person.name }}</span>
            </a>
          </div>
          <div class="pt-4 border-t border-white/5">
            <p class="text-xs text-slate-600 mb-1">开源许可</p>
            <a
              href="https://github.com/magiccode1412/magicpush/blob/dev/LICENSE"
              target="_blank"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 bg-white/5 rounded-md hover:bg-white/10 transition-colors"
            >
              MIT License
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p class="text-xs text-slate-600">&copy; 2026 magiccode1412. All rights reserved.</p>
        <p class="text-xs text-slate-700">Made with care for the open source community.</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
const thanks = [
  { name: 'Lando', avatar: '/image/thanks/Lando.jpg', link: 'https://github.com/Sunanang' },
  { name: 'tt-haogege', avatar: 'https://avatars.githubusercontent.com/u/56960885?v=4', link: 'https://github.com/tt-haogege' }
]
</script>
