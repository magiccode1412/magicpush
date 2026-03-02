<template>
  <router-view v-slot="{ Component }">
    <transition name="page-transition" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
</script>

<style>
.page-transition-enter-active,
.page-transition-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-transition-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-transition-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
