<template>
  <header
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-[#0F0F1A]/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
    ]"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex items-center justify-between h-16 md:h-20">
        <!-- Logo -->
        <a href="/" class="flex items-center gap-3 group">
          <img
            src="/logo.png"
            alt="MagicPush"
            class="w-9 h-9 rounded-lg group-hover:scale-110 transition-transform duration-300"
          />
          <span class="text-lg font-bold text-white hidden sm:block">MagicPush</span>
        </a>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center gap-1">
          <a href="#features" class="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            功能特性
          </a>
          <a href="#deploy" class="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            部署文档
          </a>
          <a href="#changelog" class="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            更新日志
          </a>
          <a
            href="https://uptimeflare-ept.pages.dev/"
            target="_blank"
            class="ml-2 px-4 py-2 text-sm font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-all"
          >
            在线 Demo
          </a>
          <a
            href="https://github.com/magiccode1412/magicpush"
            target="_blank"
            class="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </a>
        </div>

        <!-- Mobile Menu Button -->
        <button
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="md:hidden p-2 text-slate-400 hover:text-white"
        >
          <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </nav>

      <!-- Mobile Menu -->
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="mobileMenuOpen" class="md:hidden pb-4 pt-2 border-t border-white/5">
          <div class="flex flex-col gap-1">
            <a href="#features" class="px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg" @click="mobileMenuOpen = false">功能特性</a>
            <a href="#deploy" class="px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg" @click="mobileMenuOpen = false">部署文档</a>
            <a href="#changelog" class="px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg" @click="mobileMenuOpen = false">更新日志</a>
            <a href="https://uptimeflare-ept.pages.dev/" target="_blank" class="px-4 py-3 text-sm text-purple-300 font-medium" @click="mobileMenuOpen = false">在线 Demo</a>
            <a href="https://github.com/magiccode1412/magicpush" target="_blank" class="px-4 py-3 text-sm text-slate-300" @click="mobileMenuOpen = false">GitHub</a>
          </div>
        </div>
      </Transition>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const scrolled = ref(false)
const mobileMenuOpen = ref(false)

const handleScroll = () => {
  scrolled.value = window.scrollY > 50
}

onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>
