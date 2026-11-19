<script setup lang="ts">
const paths = {
  globe: ['M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Z', 'M2 8h12M8 2c3 3.2 3 8.8 0 12-3-3.2-3-8.8 0-12Z'],
  chevron: ['m4 6 4 4 4-4'],
  grid: ['M2 2h4.5v4.5H2zM9.5 2H14v4.5H9.5zM2 9.5h4.5V14H2zM9.5 9.5H14V14H9.5z'],
  database: [
    'M13 4c0 1.1-2.2 2-5 2s-5-.9-5-2 2.2-2 5-2 5 .9 5 2Z',
    'M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2',
  ],
  check: ['m3.5 8 3 3 6-6'],
  user: ['M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 14c0-2.2 2.2-4 5-4s5 1.8 5 4'],
  agent: [
    'M4 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z',
    'M10 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  ],
  skill: ['M6 2v4H2v4h4v4h4v-4h4V6h-4V2Z'],
  star: ['m8 2 1.8 4 4.2.6-3 3 .7 4.4L8 12l-3.7 2 .7-4.4-3-3L6.2 6Z'],
  logout: ['M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6'],
  menu: ['M2 4h12M2 8h12M2 12h12'],
  close: ['m4 4 8 8M12 4l-8 8'],
} as const

withDefaults(defineProps<{ name: keyof typeof paths; size?: number }>(), { size: 16 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="(path, index) in paths[name]"
      :key="index"
      :d="path"
      stroke="currentColor"
      stroke-width="1.3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
