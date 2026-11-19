<script setup lang="ts">
import { onUnmounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { installPlatformVisits } from '@/composables/platformVisits'

onUnmounted(installPlatformVisits(useRouter()))
</script>

<template>
  <RouterView />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scrollbar-gutter: stable;
}

body {
  margin: 0;
  padding: 0;
}

#app {
  min-height: 100vh;
}
</style>
