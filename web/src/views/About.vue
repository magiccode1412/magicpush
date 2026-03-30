<template>
  <div class="space-y-6 animate-fade-in">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">关于此项目</h2>

    <!-- 项目介绍 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div class="flex items-center gap-4 mb-6">
        <!-- <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"> -->
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center">
          <!-- <Bell class="w-8 h-8 text-white" /> -->
          <img src="/favicon.png" alt="LOGO">
        </div>
        <div>
          <h3 class="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{{ VERSION.name }}</h3>
          <p class="text-gray-500 dark:text-gray-400">统一消息推送平台</p>
        </div>
      </div>

      <div class="prose dark:prose-invert max-w-none">
        <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
          MagicPush 是一个轻量级的消息推送平台，支持多种推送渠道，可以帮助您快速实现消息推送功能。
          通过统一的 API 接口，您可以轻松地向多个平台发送通知消息。
        </p>
      </div>
    </div>

    <!-- 支持的渠道 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">支持的推送渠道</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div
          v-for="channel in supportedChannels"
          :key="channel.name"
          class="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
        >
          <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', channel.bgColor]">
            <component :is="channel.icon" :class="['w-5 h-5', channel.iconColor]" />
          </div>
          <span class="font-medium text-gray-900 dark:text-white">{{ channel.name }}</span>
        </div>
      </div>
    </div>

    <!-- 功能特性 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">功能特性</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="flex gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
        >
          <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <component :is="feature.icon" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white">{{ feature.title }}</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 技术栈 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">技术栈</h3>
      <div class="flex flex-wrap gap-3">
        <span
          v-for="tech in techStack"
          :key="tech"
          class="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {{ tech }}
        </span>
      </div>
    </div>

    <!-- 开源信息 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">开源信息</h3>
      <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
        <p>本项目基于 MIT 协议开源</p>
        <div class="flex items-center gap-4">
          <a
            href="https://github.com/magiccode1412/magicpush"
            target="_blank"
            class="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Github class="w-4 h-4" />
            GitHub 仓库
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Bell, Github, Zap, Shield, Database, Globe, Code, Layers, MessageSquare, Send, Bot, Radio, MessageCircle, Link, Mail, Cat } from 'lucide-vue-next'
import { VERSION } from '@/utils/version'

const supportedChannels = [
  { name: '微信龙虾机器人', icon: Bot, bgColor: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
  { name: '企业微信', icon: MessageSquare, bgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { name: 'Telegram', icon: Send, bgColor: 'bg-sky-100 dark:bg-sky-900/30', iconColor: 'text-sky-600 dark:text-sky-400' },
  { name: 'PushPlus', icon: Zap, bgColor: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  { name: 'WxPusher', icon: Bot, bgColor: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
  { name: '飞书', icon: Radio, bgColor: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  { name: '钉钉', icon: Bell, bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
  { name: '微信公众号', icon: MessageCircle, bgColor: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  { name: 'Server酱', icon: Zap, bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400' },
  { name: 'Webhook', icon: Link, bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  { name: 'SMTP邮件', icon: Mail, bgColor: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  { name: 'Gotify', icon: Bell, bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  { name: 'Meow', icon: Cat, bgColor: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
]

const features = [
  { title: '多渠道支持', description: '支持企业微信、Telegram、飞书、钉钉、SMTP邮件、Gotify、Meow等多种推送渠道', icon: Layers },
  { title: '统一 API', description: '通过统一的 REST API 接口发送消息，简化集成流程', icon: Code },
  { title: '接口管理', description: '灵活管理推送接口和访问令牌', icon: Shield },
  { title: '推送记录', description: '完整的推送历史记录，方便追踪和排查问题', icon: Database },
]

const techStack = [
  'Vue 3',
  'Vite',
  'Element Plus',
  'Tailwind CSS',
  'Express.js',
  'Sequelize',
  'SQLite',
  'Docker',
]
</script>
