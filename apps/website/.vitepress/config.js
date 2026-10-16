import { defineConfig } from 'vitepress'
import { readStableVersion, resolveChannel } from './channel'

/**
 * 渠道判定：决定本次构建产出的是正式版（stable）还是开发版（dev）文档。
 * dev 渠道会额外带上顶部横幅、页面标题后缀与 noindex，
 * 避免尚未发布的内容被当成正式文档阅读或收录。
 *
 * 判定优先级见 ./channel.ts，可用 DOCS_CHANNEL=dev|stable 强制指定。
 */
const { channel, source } = resolveChannel()
const isDevChannel = channel === 'dev'
const stableVersion = readStableVersion()
const stableUrl = (process.env.DOCS_STABLE_URL || 'https://magicpush.160621.xyz').replace(/\/+$/, '')
/** 站点正式域名，用于 canonical / Open Graph / Twitter 等绝对地址 */
const siteUrl = (process.env.DOCS_SITE_URL || 'https://magicpush.160621.xyz').replace(/\/+$/, '')
const base = process.env.VITE_BASE_PATH || '/'
const ogImage = `${siteUrl}${base}/logo.png`

console.log(`[DOCS_CHANNEL] ${channel} (source: ${source})`)
console.log(`[DOCS_STABLE] version=${stableVersion || 'unknown'} url=${stableUrl}`)

/** 站点标题与描述，dev / stable 渠道各自不同，供 head 与 transformPageData 复用 */
const siteTitle = isDevChannel ? 'MagicPush 开发版' : 'MagicPush 魔法推送'
const siteDescription = isDevChannel
  ? 'MagicPush 开发版文档（dev 分支），可能包含尚未发布的功能与变更'
  : '支持多种消息渠道的推送服务管理平台，通过标准化 REST API 将消息推送到微信、Telegram、飞书、钉钉、邮件、小爱音箱等 20+ 通知渠道'
const siteKeywords = 'MagicPush, 魔法推送, 消息推送, 推送服务, REST API, 微信推送, Telegram, 飞书, 钉钉, 邮件推送, 多渠道推送, 开源推送平台'

/** dev 渠道页面标题后缀：浏览器标签页窄、站点标题被截断时也能区分 */
const DEV_TITLE_SUFFIX = '（开发版）'

export default defineConfig({
  base,
  cleanUrls: true,
  ignoreDeadLinks: true,
  title: siteTitle,
  titleTemplate: ':title | MagicPush',
  description: siteDescription,

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/logo.png' }],
    ['meta', { charset: 'utf-8' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['meta', { name: 'description', content: siteDescription }],
    ['meta', { name: 'keywords', content: siteKeywords }],
    ['meta', { name: 'author', content: 'magiccode1412' }],

    // Open Graph（站点级常量，逐页标题/描述/url 在 transformHead 注入）
    ['meta', { property: 'og:site_name', content: 'MagicPush 魔法推送' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:image:width', content: '512' }],
    ['meta', { property: 'og:image:height', content: '512' }],
    ['meta', { property: 'og:image:alt', content: `${siteTitle} Logo` }]
  ],

  // dev 渠道：页面标题加后缀（标签页可区分）+ 禁止搜索引擎收录未发布内容
  transformPageData(pageData) {
    if (!isDevChannel) return
    if (pageData.frontmatter?.layout === 'home') {
      pageData.title = 'MagicPush 开发版'
      pageData.description = 'MagicPush 开发版文档（dev 分支），可能包含尚未发布的功能与变更'
      return
    }
    if (pageData.title) pageData.title = `${pageData.title}${DEV_TITLE_SUFFIX}`
  },

  transformHead({ page, head }) {
    if (isDevChannel) {
      // 开发版禁止搜索引擎收录尚未发布的内容
      head.push(['meta', { name: 'robots', content: 'noindex,nofollow' }])
    } else {
      head.push(['meta', { name: 'robots', content: 'index,follow' }])
    }

    // 由当前页面路径拼出绝对规范地址（canonical / og:url）
    const raw = (page.relativePath || 'index.md').replace(/\.md$/, '').replace(/index$/, '').replace(/\/+$/, '')
    const route = raw ? `${base}/${raw}.html` : `${base}/`
    const canonical = `${siteUrl}${route}`
    const pageTitle = page.title || siteTitle
    const pageDesc = page.description || siteDescription

    head.push(['link', { rel: 'canonical', href: canonical }])
    head.push(['meta', { property: 'og:url', content: canonical }])
    head.push(['meta', { property: 'og:title', content: pageTitle }])
    head.push(['meta', { property: 'og:description', content: pageDesc }])
  },

  themeConfig: {
    nav: buildNav(),

    sidebar: {
      '/guide/': [
        {
          text: '快速开始',
          items: [
            { text: '简介', link: '/guide/getting-started' }
          ]
        },
        {
          text: '部署',
          items: [
            { text: 'Docker 部署', link: '/guide/deploy/docker' },
            { text: '飞牛NAS', link: '/guide/deploy/feiNiu' }
          ]
        },
        {
          text: '应用场景',
          items: [
            { text: '典型应用案例', link: '/guide/use-cases' }
          ]
        },
        {
          text: '接口管理',
          items: [
            { text: '消息免打扰', link: '/guide/api/do-not-disturb' },
            { text: '入站配置', link: '/guide/api/inbound-config' },
            { text: '关键词过滤', link: '/guide/api/keyword-filter' },
            { text: '内容替换', link: '/guide/api/content-replace' }
          ]
        },
        {
          text: '推送渠道配置',
          items: [
            { text: '各渠道频率限制', link: '/guide/channels/rate-limits' },
            {
              text: '详细渠道配置',
              items: [
                { text: '企业微信应用', link: '/guide/channels/wecomapp' },
                { text: '企业微信群机器人', link: '/guide/channels/wecom' },
                { text: '钉钉', link: '/guide/channels/dingtalk' },
                { text: '飞书', link: '/guide/channels/feishu' },
                { text: 'Telegram', link: '/guide/channels/telegram' },
                { text: 'SMTP 邮件', link: '/guide/channels/smtp' },
                { text: 'Webhook', link: '/guide/channels/webhook' },
                { text: 'PushPlus', link: '/guide/channels/pushplus' },
                { text: 'Server酱', link: '/guide/channels/serverchan' },
                { text: 'Bark', link: '/guide/channels/bark' },
                { text: 'WxPusher', link: '/guide/channels/wxpusher' },
                { text: 'PushDeer', link: '/guide/channels/pushdeer' },
                { text: 'PushMe', link: '/guide/channels/pushme' },
                { text: 'ntfy', link: '/guide/channels/ntfy' },
                { text: '小爱音箱', link: '/guide/channels/misound' },
                { text: 'iGot', link: '/guide/channels/igot' },
                { text: 'Gotify', link: '/guide/channels/gotify' },
                { text: '息知', link: '/guide/channels/xizhi' },
                { text: 'Synology Chat', link: '/guide/channels/synologychat' },
                { text: 'QQ机器人', link: '/guide/channels/qqbot' },
                { text: '微信群机器人', link: '/guide/channels/wechatclawbot' },
                { text: '微信公众号', link: '/guide/channels/wechat-official' },
                { text: 'meow', link: '/guide/channels/meow' },
                { text: '元宝机器人', link: '/guide/channels/yuanbaobot' },
                { text: 'ShowDoc', link: '/guide/channels/showdoc' }
              ]
            }
          ]
        },
        {
          text: '开发文档',
          items: [
            { text: '项目概览', link: '/guide/dev/overview' },
            { text: '架构设计', link: '/guide/dev/architecture' },
            { text: '数据库设计', link: '/guide/dev/database' },
            { text: 'API 接口文档', link: '/guide/dev/api-reference' }
          ]
        },
        {
          text: '开发规范',
          items: [
            { text: '命名规范', link: '/guide/dev/naming-conventions' },
            { text: '代码风格规范', link: '/guide/dev/coding-standards' },
            { text: '后端开发指南', link: '/guide/dev/backend-development' },
            { text: '测试指南', link: '/guide/dev/testing' },
            { text: '前端开发指南', link: '/guide/dev/frontend-guide' }
          ]
        },
        {
          text: '扩展指南',
          items: [
            { text: '新增渠道开发', link: '/guide/dev/new-channel-guide' },
            { text: '特有消息类型开发', link: '/guide/dev/channel-specific-types' }
          ]
        },
        {
          text: '其他',
          items: [
            { text: '更新日志', link: '/guide/changelog' },
            { text: '隐私政策', link: '/guide/privacy-policy' },
            { text: '服务条款', link: '/guide/terms-of-service' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/magiccode1412/magicpush' }
    ],

    footer: {
      message: isDevChannel
        ? '开发版文档（dev 分支）· 基于 MIT 许可证开源'
        : '基于 MIT 许可证开源',
      copyright: '&copy; 2026 magiccode1412. All rights reserved.'
    }
  },

  // 开发版不生成站点地图，避免未发布内容被搜索引擎发现
  ...(isDevChannel ? {} : {
    sitemap: {
      hostname: siteUrl,
      transformItems(items) {
        return items.map((item) => {
          item.changefreq = item.url === '' ? 'daily' : 'weekly'
          item.priority = item.url === '' ? 1.0 : 0.7
          return item
        })
      }
    }
  }),

  vite: {
    // 将构建渠道判定编译期注入客户端全局常量，供自定义主题组件条件渲染使用。
    // stable 构建下条件分支会被折叠消除，不影响正式版体积与渲染路径。
    define: {
      __DOCS_CHANNEL__: JSON.stringify(channel),
      __DOCS_STABLE_VERSION__: JSON.stringify(stableVersion),
      __DOCS_STABLE_URL__: JSON.stringify(stableUrl)
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: true
    }
  }
})

/** 导航栏：dev 渠道在最前面插入一条前往正式版文档的入口 */
function buildNav() {
  const nav = [
    { text: '指南', link: '/guide/getting-started' },
    { text: '应用场景', link: '/guide/use-cases' },
    {
      text: '接口管理', items: [
        { text: '消息免打扰', link: '/guide/api/do-not-disturb' },
        { text: '入站配置', link: '/guide/api/inbound-config' },
        { text: '关键词过滤', link: '/guide/api/keyword-filter' },
        { text: '内容替换', link: '/guide/api/content-replace' }
      ]
    },
    {
      text: '推送渠道配置', items: [
        { text: '各渠道频率限制', link: '/guide/channels/rate-limits' },
        { text: '详细渠道配置', link: '/guide/channels/overview' }
      ]
    },
    { text: '开发文档', link: '/guide/dev/overview' },
    { text: '更新日志', link: '/guide/changelog' }
  ]
  return nav
}
