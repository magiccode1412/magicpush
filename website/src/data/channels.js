export const channels = [
  { name: '微信龙虾机器人', category: '微信生态', description: '扫码绑定，直接推送到个人微信，有10条/24小时限制' },
  { name: '元宝 Bot', category: '微信生态', description: 'WebSocket绑定，支持私聊/群聊消息推送' },
  { name: '微信公众号', category: '微信生态', description: '模板消息推送，支持测试号' },
  { name: 'Server酱', category: '微信生态', description: '微信推送服务，通过SendKey推送到微信' },
  { name: '企业微信机器人', category: '微信生态', description: '企业微信群机器人 Webhook 推送' },
  { name: '企业微信应用', category: '微信生态', description: '企业内部应用消息推送，~200次/分钟' },
  { name: 'PushPlus', category: '微信生态', description: '多渠道推送，含微信服务号/App/webhook' },
  { name: 'WxPusher', category: '微信生态', description: '手机系统级推送，无需App运行在后台' },
  { name: '息知', category: '微信生态', description: '极简微信通知接口，永久免费' },

  { name: 'Telegram Bot', category: '即时通讯', description: '全球最受欢迎的开源IM Bot推送' },
  { name: '飞书机器人', category: '即时通讯', description: '飞书群自定义机器人 Webhook 推送' },
  { name: '钉钉机器人', category: '即时通讯', description: '钉钉群自定义机器人 Webhook 推送' },
  { name: '群晖 Chat', category: '即时通讯', description: 'Synology NAS 即时通讯 Incoming Webhook' },

  { name: 'SMTP邮件', category: '邮件与推送', description: '支持QQ邮箱、163邮箱、Gmail等主流邮箱服务' },
  { name: 'Bark', category: '邮件与推送', description: 'iOS 自定义推送通知，无平台频率限制' },
  { name: 'Meow', category: '邮件与推送', description: '鸿蒙系统原生推送应用' },
  { name: 'PushDeer', category: '邮件与推送', description: '全平台推送 iOS/Android/Mac（已停止维护）' },
  { name: 'iGot', category: '邮件与推送', description: '开放式通知推送，支持iOS/Android' },

  { name: 'Webhook', category: '通用/自托管', description: '通用HTTP推送，支持自定义URL/Headers/Body' },
  { name: 'Gotify', category: '通用/自托管', description: '开源自托管推送服务器' },
  { name: 'ntfy', category: '通用/自托管', description: '开源跨平台推送服务，支持自托管' },
  { name: 'PushMe', category: '通用/自托管', description: '多平台统一推送服务' }
]

export const channelCategories = [...new Set(channels.map(c => c.category))]
