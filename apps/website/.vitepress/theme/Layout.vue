<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import ChannelBanner from './components/ChannelBanner.vue'
import DevBadge from './components/DevBadge.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <!-- 顶部整宽开发版横幅：仅在 dev 渠道构建时渲染 -->
    <template #layout-top>
      <ChannelBanner />
    </template>
    <!-- 导航标题旁的「开发版」徽标：仅在 dev 渠道构建时渲染 -->
    <template #nav-bar-title-after>
      <DevBadge />
    </template>
  </Layout>
</template>
