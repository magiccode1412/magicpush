# MagicPush 官方网站

MagicPush（魔法推送）项目的官方静态网站，基于 **VitePress + Vue 3 + Tailwind CSS** 混合架构构建。

## 技术栈

| 技术 | 用途 |
|------|------|
| [VitePress](https://vitepress.dev/) | SSG 静态站点生成框架 |
| Vue 3 (Composition API) | 自定义展示组件 |
| Tailwind CSS 3.x | 原子化 CSS 样式系统 |
| lucide-vue-next | 图标库 |

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173 查看效果。

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `.vitepress/dist/` 目录。

### 预览构建结果

```bash
npm run preview
```

## 项目结构

```
website/
├── .vitepress/
│   ├── config.js              # VitePress 配置
│   └── theme/
│       ├── index.ts           # 主题入口（注册全局组件）
│       ├── HomeLayout.vue     # 首页自定义布局
│       └── styles.css         # 全局样式 + Tailwind
├── src/
│   ├── components/
│   │   ├── layout/            # 布局组件（Header/Footer）
│   │   ├── sections/          # 页面区块组件
│   │   └── ui/                # 可复用 UI 组件
│   └── data/                  # 静态数据文件
├── public/                    # 静态资源
├── index.md                   # 首页
├── tailwind.config.js          # Tailwind 配置
├── postcss.config.js           # PostCSS 配置
└── package.json
```

## 设计风格

采用 **Glassmorphism 科技玻璃态**设计语言：

- 深色渐变背景 + 半透明毛玻璃卡片
- 紫蓝主色调渐变文字与边框光效
- 滚动触发的入场动画 (scroll-reveal)
- 响应式布局适配桌面端与移动端

## 部署

构建后的静态文件可部署到任意静态托管平台：

- **GitHub Pages**: 将 `dist` 目录推送到 gh-pages 分支
- **Cloudflare Pages**: 连接 Git 仓库自动部署
- **EdgeOne Pages**: 腾讯云 EdgeOne 静态托管
- **Vercel / Netlify**: 支持 VitePress 的平台

## License

MIT License - 与 [MagicPush](https://github.com/magiccode1412/magicpush) 主项目保持一致。
