/**
 * 由 .vitepress/config.js 的 vite.define 在构建期注入的编译期常量。
 * 这里只做类型声明，不产生运行时代码。
 */
declare const __DOCS_CHANNEL__: 'dev' | 'stable'
declare const __DOCS_STABLE_VERSION__: string
declare const __DOCS_STABLE_URL__: string
