<template>
  <div class="space-y-6 animate-fade-in">
    <!-- 项目头部 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
      <div class="flex justify-center mb-6">
        <img src="/favicon.png" alt="MagicPush Logo" class="w-32 h-32 rounded-2xl">
      </div>
      <h2 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">魔法推送</h2>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed max-w-3xl mx-auto">
        一个支持多种消息渠道的推送服务管理平台，用户可以通过标准化的REST API接口将消息推送到多种通知渠道
      </p>
      <div class="flex flex-wrap justify-center gap-4 mb-6">
        <a href="https://www.160621.xyz/magicpush" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium">
          <Globe class="w-4 h-4" />
          官方网站
        </a>
        <a href="https://www.160621.xyz/magicpush/guide/dev/overview.html" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors font-medium">
          <FileText class="w-4 h-4" />
          开发文档
        </a>
        <a href="https://github.com/magiccode1412/magicpush" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors font-medium">
          <Github class="w-4 h-4" />
          项目地址
        </a>
        <a href="https://www.160621.xyz/magicpush-dev/guide/changelog.html" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors font-medium">
          <Clock class="w-4 h-4" />
          更新日志
        </a>
      </div>
      <div class="flex flex-wrap justify-center gap-3 text-sm mb-6">
        <span class="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400 rounded-full font-medium border border-green-200 dark:border-green-800">
          MIT License
        </span>
        <span class="px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 text-orange-700 dark:text-orange-400 rounded-full font-medium border border-orange-200 dark:border-orange-800">
          v{{ VERSION.version }}
        </span>
        <span class="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-400 rounded-full font-medium border border-blue-200 dark:border-blue-800">
          Docker Support
        </span>
      </div>

      <!-- Shields.io 徽章 -->
      <div class="flex flex-wrap justify-center items-center gap-3">
        <a href="./LICENSE" target="_blank" title="MIT License">
          <img src="https://img.shields.io/github/license/magiccode1412/magicpush" alt="MIT License" class="h-5 rounded">
        </a>
        <a href="./version.json" target="_blank" title="Latest Version">
          <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fmagiccode1412%2Fmagicpush%2Frefs%2Fheads%2Fmain%2Fversion.json&query=%24.version&prefix=v&style=flat&label=version&labelColor=orange" alt="Latest Version" class="h-5 rounded">
        </a>
        <a href="https://hub.docker.com/r/magiccode1412/magicpush" target="_blank" title="Docker Pulls">
          <img src="https://img.shields.io/docker/pulls/magiccode1412/magicpush?labelColor=%20%23528bff&color=%20%23155EEF" alt="Docker Pulls" class="h-5 rounded">
        </a>
        <a href="https://hub.docker.com/r/magiccode1412/magicpush" target="_blank" title="Docker Image Size">
          <img src="https://img.shields.io/docker/image-size/magiccode1412/magicpush" alt="Docker Image Size" class="h-5 rounded">
        </a>
      </div>
    </div>

    <!-- 打赏 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
      <h3 class="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">💝 打赏</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 支付宝 -->
        <div class="text-center group">
          <div class="mb-3">
            <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 p-1 group-hover:scale-105 transition-transform duration-300">
              <img src="/image/alipay.png" alt="支付宝" class="w-full h-48 object-cover rounded-lg bg-white">
            </div>
          </div>
          <p class="font-medium text-gray-700 dark:text-gray-300 mb-2">支付宝</p>
          <span class="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white text-sm rounded-lg">
            <Heart class="w-4 h-4" />
            支付宝打赏
          </span>
        </div>

        <!-- 微信 -->
        <div class="text-center group">
          <div class="mb-3">
            <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 p-1 group-hover:scale-105 transition-transform duration-300">
              <img src="/image/wechat.png" alt="微信" class="w-full h-48 object-cover rounded-lg bg-white">
            </div>
          </div>
          <p class="font-medium text-gray-700 dark:text-gray-300 mb-2">微信</p>
          <span class="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-sm rounded-lg">
            <Heart class="w-4 h-4" />
            微信打赏
          </span>
        </div>
      </div>
    </div>

    <!-- 感谢墙 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
      <h3 class="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">💖 感谢墙</h3>
      <div class="flex justify-center items-center gap-12 flex-wrap">
        <div class="text-center group cursor-pointer">
          <a href="https://github.com/Sunanang" target="_blank" class="block">
            <div class="relative mb-3">
              <img src="/image/thanks/Lando.jpg"
                   alt="Lando"
                   class="w-20 h-20 rounded-full object-cover ring-4 ring-blue-500 dark:ring-blue-400 group-hover:ring-purple-500 dark:group-hover:ring-purple-400 transition-all duration-300 group-hover:scale-110 transform">
              <div class="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <p class="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Lando</p>
          </a>
        </div>

        <div class="text-center group cursor-pointer">
          <a href="https://github.com/tt-haogege" target="_blank" class="block">
            <div class="relative mb-3">
              <img src="https://avatars.githubusercontent.com/u/56960885?v=4"
                   alt="tt-haogege"
                   class="w-20 h-20 rounded-full object-cover ring-4 ring-green-500 dark:ring-green-400 group-hover:ring-teal-500 dark:group-hover:ring-teal-400 transition-all duration-300 group-hover:scale-110 transform">
              <div class="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-teal-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <p class="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">tt-haogege</p>
          </a>
        </div>

        <div class="text-center group cursor-pointer">
          <a href="https://github.com/HuFakai" target="_blank" class="block">
            <div class="relative mb-3">
              <img src="https://avatars.githubusercontent.com/u/54195943?v=4"
                   alt="HuFakai"
                   class="w-20 h-20 rounded-full object-cover ring-4 ring-orange-500 dark:ring-orange-400 group-hover:ring-amber-500 dark:group-hover:ring-amber-400 transition-all duration-300 group-hover:scale-110 transform">
              <div class="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <p class="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">HuFakai</p>
          </a>
        </div>
      </div>
    </div>

    <!-- 技术栈 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">技术栈</h3>
      <div class="flex flex-wrap gap-3 justify-center">
        <span
          v-for="tech in techStack"
          :key="tech"
          class="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {{ tech }}
        </span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { Github, Globe, FileText, Clock, Heart } from 'lucide-vue-next'
import { VERSION } from '@/utils/version'

const techStack = [
  'Node.js 18+',
  'Express.js 4.x',
  'SQLite3 (better-sqlite3)',
  'JWT (jsonwebtoken)',
  'bcryptjs',
  'express-rate-limit',
  'Vue 3 (Composition API)',
  'Vite 5.x',
  'Tailwind CSS 3.x',
  'Element Plus',
  'Pinia',
  'Vue Router 4.x',
  'Docker',
]
</script>
