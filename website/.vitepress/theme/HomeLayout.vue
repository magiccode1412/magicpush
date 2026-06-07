<template>
  <div class="min-h-screen bg-[#0F0F1A]">
    <!-- Fixed Navigation -->
    <AppHeader />

    <main>
      <!-- Hero Section -->
      <HeroSection />

      <!-- Pain Points -->
      <PainPointsSection />

      <!-- Architecture Comparison -->
      <ArchitectureSection />

      <!-- Core Features -->
      <FeaturesSection id="features" />

      <!-- Supported Channels -->
      <ChannelsSection />

      <!-- Product Preview -->
      <PreviewSection />

      <!-- Tech Stack -->
      <TechStackSection />

      <!-- Deployment Guide -->
      <DeploySection id="deploy" />

      <!-- Changelog -->
      <ChangelogSection id="changelog" />
    </main>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

// Scroll reveal observer
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  )

  document.querySelectorAll('.animate-reveal').forEach(el => observer.observe(el))
})
</script>
