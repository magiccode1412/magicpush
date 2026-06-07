export const features = [
  {
    name: '多渠道同时推送',
    icon: 'Send',
    description: '一次API请求同时推送到微信、Telegram、飞书、钉钉等多个消息渠道，确保消息触达率最大化'
  },
  {
    name: '标准化 REST API',
    icon: 'Code',
    description: '统一规范的RESTful接口设计，支持GET/POST方式，易于与任何系统集成，完善的错误码体系'
  },
  {
    name: 'JWT 双令牌认证',
    icon: 'ShieldCheck',
    description: 'Access Token + Refresh Token 双令牌机制，令牌自动刷新无感续期，安全性远超单一Token方案'
  },
  {
    name: '关键词智能过滤',
    icon: 'Filter',
    description: '支持黑名单和白名单两种模式，可按每个推送接口独立配置过滤规则，灵活管控消息内容'
  },
  {
    name: '消息免打扰 DND',
    icon: 'Moon',
    description: '按接口配置多个免打扰时段，全局一键开关控制。深夜不再被无关通知打扰'
  },
  {
    name: '三层限流防护',
    icon: 'Shield',
    description: 'Nginx IP层 + Express全局层 + 接口级独立限流，三重保护防止接口滥用和DDoS攻击'
  }
]

export const securityFeatures = [
  { name: '三层限流防护', icon: 'ShieldCheck' },
  { name: '动态限流配置', icon: 'Settings2' },
  { name: '全局限流开关', icon: 'ToggleRight' },
  { name: '双重推送限流', icon: 'Lock' }
]
