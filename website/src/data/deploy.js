export const deployMethods = [
  {
    id: 'docker',
    title: 'Docker 预构建镜像',
    subtitle: '一行命令即可启动（推荐）',
    code: `docker run -d -p 3000:3000 \\
  -v ./data:/app/server/data \\
  -v ./logs:/app/server/logs \\
  magiccode1412/magicpush:latest`,
    steps: ['拉取预构建镜像', '映射数据目录持久化存储', '访问 http://<服务器ip>:3000'],
    note: '支持 amd64 / arm64 架构，All-in-One 模式包含 Express 层两层限流防护'
  },
  {
    id: 'compose',
    title: 'Docker Compose',
    subtitle: '适合生产环境部署',
    code: `services:
  app:
    image: magiccode1412/magicpush:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/server/data
      - ./logs:/app/server/logs
    network_mode: bridge
    restart: always
    container_name: magicpush`,
    steps: ['创建 docker-compose.yml 文件', '运行 docker-compose up -d', '自动后台运行并开机自启'],
    note: '国内用户可使用 docker.cnb.cool 镜像源加速'
  },
  {
    id: 'railway',
    title: 'Railway 一键部署',
    subtitle: '零配置云托管',
    code: '# 点击下方按钮一键部署到 Railway\n# 免费试用 30 天（5美元积分）\n# 之后每月 $1 起',
    steps: ['点击 Deploy on Railway 按钮', '授权 GitHub 仓库', 'Railway 自动构建并部署'],
    note: '注意：试用结束后需手动更改计划，低价方案存在冷启动延迟',
    hasDeployButton: true
  }
]

export const techStack = {
  backend: [
    { name: 'Node.js 18+', icon: 'Server' },
    { name: 'Express.js 4.x', icon: 'Globe' },
    { name: 'SQLite3', icon: 'Database' },
    { name: 'JWT Auth', icon: 'Lock' },
    { name: 'bcryptjs', icon: 'KeyRound' }
  ],
  frontend: [
    { name: 'Vue 3', icon: 'Layers' },
    { name: 'Vite 5', icon: 'Zap' },
    { name: 'Tailwind CSS', icon: 'Palette' },
    { name: 'Element Plus', icon: 'LayoutGrid' },
    { name: 'Pinia', icon: 'Box' },
    { name: 'Vue Router', icon: 'Compass' }
  ]
}
