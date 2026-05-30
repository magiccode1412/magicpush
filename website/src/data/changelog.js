export const changelog = [
  {
    version: '1.11.0',
    date: '2026-05-19',
    changes: [
      '升级接口管理的入站配置，支持字符串拼接',
      '修复令牌过期导致的401刷新死循环与重复跳转问题'
    ]
  },
  {
    version: '1.10.1',
    date: '2026-05-11',
    changes: [
      '紧急修复v1.10.0版本渠道管理页面空白问题',
      '接口显示页面添加自定义URL配置'
    ]
  },
  {
    version: '1.10.0',
    date: '2026-05-06',
    changes: [
      '新增通知渠道: ntfy / pushdeer / igot / 群晖chat',
      '支持检测开发版本更新'
    ]
  },
  {
    version: '1.9.0',
    date: '2026-05-02',
    changes: [
      '新增推送渠道：元宝bot（支持bot私聊及群聊）'
    ]
  },
  {
    version: '1.8.1',
    date: '2026-04-29',
    changes: [
      '接口管理：入站配置支持字段映射多路径配置',
      '推送记录：添加关键字筛选条件',
      '新增远程版本检测功能',
      '部分渠道添加推送渠道官方文档链接'
    ]
  }
]

export const meta = {
  name: '魔法推送',
  englishName: 'MagicPush',
  version: '1.11.0',
  license: 'MIT',
  repository: 'https://github.com/magiccode1412/magicpush',
  dockerHub: 'https://hub.docker.com/r/magiccode1412/magicpush',
  demoUrl: 'https://uptimeflare-ept.pages.dev/',
  description: '一个支持多种消息渠道的推送服务管理平台，用户可以通过标准化的REST API接口将消息推送到多种通知渠道。'
}
