import { defineConfig } from 'vitepress'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  ignoreDeadLinks: true,
  title: 'MagicPush 魔法推送',
  description: '支持多种消息渠道的推送服务管理平台，通过标准化 REST API 将消息推送到微信、Telegram、飞书、钉钉、邮件等 20+ 通知渠道',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/logo.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'MagicPush 魔法推送' }],
    ['meta', { property: 'og:description', content: '支持 20+ 消息渠道的统一推送服务管理平台' }],
    ['meta', { property: 'og:image', content: '/logo.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap', rel: 'stylesheet' }]
  ],
  themeConfig: {
    nav: [
      { text: '功能特性', link: '#features' },
      { text: '部署文档', link: '#deploy' },
      { text: '更新日志', link: '#changelog' },
      {
        text: '在线 Demo',
        link: 'https://uptimeflare-ept.pages.dev/',
        target: '_blank'
      },
      {
        text: 'GitHub',
        link: 'https://github.com/magiccode1412/magicpush',
        target: '_blank'
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/magiccode1412/magicpush' }
    ],
    footer: {
      message: '基于 MIT 许可证开源',
      copyright: '&copy; 2026 magiccode1412. All rights reserved.'
    }
  },
  vite: {
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer
        ]
      }
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: true
    }
  }
})
