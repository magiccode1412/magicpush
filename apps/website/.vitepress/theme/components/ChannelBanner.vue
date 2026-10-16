<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const CHANNEL: 'dev' | 'stable' = __DOCS_CHANNEL__
const STABLE_VERSION: string = __DOCS_STABLE_VERSION__
const STABLE_URL: string = __DOCS_STABLE_URL__

const visible = ref(true)
const bannerRef = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null

// key 带上稳定版本号：发布新版本后提示会重新出现，不会一直被记住
const storageKey = `magicpush-docs:channel-banner:${STABLE_VERSION}`

/**
 * VitePress 用 --vp-layout-top-height 让导航栏、侧边栏、正文整体下移。
 * 它定义在 .Layout 上（后代才会继承），所以这里同步到 banner 的父元素。
 */
function syncHeight() {
  const banner = bannerRef.value
  const layout = banner?.parentElement
  if (!banner || !layout) return
  layout.style.setProperty('--vp-layout-top-height', `${banner.offsetHeight}px`)
}

function clearHeight() {
  bannerRef.value?.parentElement?.style.removeProperty('--vp-layout-top-height')
}

onMounted(() => {
  // 默认可见（SSR 首屏就带上提示），挂载后再按用户的关闭记录决定是否隐藏
  try {
    if (window.localStorage.getItem(storageKey) === '1') visible.value = false
  } catch {
    // 隐私模式下 localStorage 不可用，保持可见
  }
  if (!visible.value) return

  syncHeight()
  if (bannerRef.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(syncHeight)
    observer.observe(bannerRef.value)
  }
  window.addEventListener('resize', syncHeight)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  window.removeEventListener('resize', syncHeight)
  clearHeight()
})

function dismiss() {
  visible.value = false
  clearHeight()
  try {
    window.localStorage.setItem(storageKey, '1')
  } catch {
    // 隐私模式下 localStorage 不可用，忽略即可
  }
}
</script>

<template>
  <div
    v-if="CHANNEL === 'dev' && visible"
    ref="bannerRef"
    class="docs-channel-banner"
    role="status"
  >
    <span class="docs-channel-banner__tag">开发版</span>
    <p class="docs-channel-banner__text">
      你正在浏览 <b>dev 分支</b>的文档，内容可能包含尚未发布的功能<template v-if="STABLE_VERSION">，最新正式版为 {{ STABLE_VERSION }}</template>。
    </p>
    <a class="docs-channel-banner__link" :href="STABLE_URL" target="_blank" rel="noopener">
      查看正式版文档 →
    </a>
    <button
      class="docs-channel-banner__close"
      type="button"
      aria-label="关闭提示"
      @click="dismiss"
    >
      &times;
    </button>
  </div>
</template>

<style>
/*
 * 横幅位于 #layout-top 插槽，是 .Layout 的第一个子元素（静态流内），
 * 导航栏是 fixed 且 top 取 --vp-layout-top-height，所以整体会被顶下去。
 * 下面两个值只是首屏兜底（JS 未执行时），实际高度由 syncHeight 精确同步。
 */
.Layout:has(> .docs-channel-banner) {
  --vp-layout-top-height: 44px;
}

.docs-channel-banner {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 44px 8px 16px;
  font-size: 13px;
  line-height: 1.6;
  color: #fff;
  background: linear-gradient(90deg, #f59e0b, #ef4444);
  box-shadow: 0 1px 3px rgb(0 0 0 / 18%);
}

.docs-channel-banner__tag {
  flex: none;
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: rgb(255 255 255 / 22%);
  border: 1px solid rgb(255 255 255 / 40%);
  border-radius: 10px;
}

.docs-channel-banner__text {
  margin: 0;
  font-size: 13px;
  color: inherit;
}

.docs-channel-banner__link {
  flex: none;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.docs-channel-banner__close {
  position: absolute;
  top: 50%;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 18px;
  line-height: 1;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transform: translateY(-50%);
  opacity: 0.75;
}

.docs-channel-banner__close:hover {
  background: rgb(255 255 255 / 20%);
  opacity: 1;
}

@media (max-width: 768px) {
  .Layout:has(> .docs-channel-banner) {
    --vp-layout-top-height: 72px;
  }

  .docs-channel-banner {
    flex-wrap: wrap;
    min-height: 72px;
    padding: 8px 44px 8px 12px;
    font-size: 12px;
    text-align: left;
    justify-content: flex-start;
  }

  .docs-channel-banner__link {
    display: none;
  }
}
</style>
