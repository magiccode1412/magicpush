<script setup lang="ts">
// 由 config.js 的 vite.define 在构建期注入（'dev' | 'stable'），stable 构建下该分支被折叠消除
const CHANNEL = __DOCS_CHANNEL__
</script>

<template>
  <span v-if="CHANNEL === 'dev'" class="dev-badge">开发版</span>
</template>

<style scoped>
.dev-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.12rem 0.45rem;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  color: #fff;
  background: linear-gradient(90deg, #f59e0b, #ef4444);
  border-radius: 999px;
  vertical-align: middle;
  white-space: nowrap;
}
</style>
