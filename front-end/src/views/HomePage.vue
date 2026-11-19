<script setup lang="ts">
import {
  AppHeader,
  HeroSection,
  AgentsSection,
  ConfigSection,
  CapabilitySection,
  WorkflowSection,
  CTASection,
} from './home/components'
import AppFooter from '@/components/AppFooter.vue'

</script>

<template>
  <div class="home-page">
    <AppHeader />
    <main class="main-content">
      <HeroSection />
      <AgentsSection />
      <ConfigSection />
      <CapabilitySection />
      <WorkflowSection />
      <CTASection />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: var(--app-color-bg-page);
}

.main-content {
  width: 100%;
}
</style>
