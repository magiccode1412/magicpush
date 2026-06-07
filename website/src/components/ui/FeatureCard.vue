<template>
  <div class="glow-border glass-card group p-6 md:p-8">
    <div
      :class="[
        'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
        'bg-gradient-to-br from-purple-500/20 to-blue-500/20',
        'group-hover:from-purple-500/30 group-hover:to-blue-500/30 transition-colors'
      ]"
    >
      <component :is="iconComponent" class="w-6 h-6 text-purple-400" />
    </div>
    <h3 class="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">{{ name }}</h3>
    <p class="text-sm text-slate-400 leading-relaxed">{{ description }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Send, Code, ShieldCheck, Filter, Moon, Shield,
  Settings2, ToggleRight, Lock, Server, Database,
  KeyRound, Globe2, Zap, Layers, LayoutGrid,
  Box, Compass, Palette, User, Link, History,
  Webhook, BellOff, Type
} from 'lucide-vue-next'

const props = defineProps({
  name: { type: String, required: true },
  icon: { type: String, required: true },
  description: { type: String, required: true }
})

const iconMap = {
  Send, Code, ShieldCheck, Filter, Moon, Shield,
  Settings2, ToggleRight, Lock, Server, Database,
  KeyRound, Globe2, Zap, Layers, LayoutGrid,
  Box, Compass, Palette, User, Link, History,
  Webhook, BellOff, Type
}

const iconComponent = computed(() => iconMap[props.icon] || Zap)
</script>
