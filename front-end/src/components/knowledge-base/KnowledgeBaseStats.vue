<script setup lang="ts">
interface StatItem {
  label: string
  value: number | string
  iconKey: 'total' | 'public' | 'private' | 'documents'
}

defineProps<{ stats: StatItem[] }>()
</script>

<template>
  <div class="stats-row">
    <div v-for="item in stats" :key="item.label" class="stat-card">
      <div class="stat-icon-wrap">
        <svg v-if="item.iconKey === 'total'" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 5h14v14H5V5z" stroke="currentColor" stroke-width="1.5" />
          <path d="M5 10h14M10 5v14" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <svg v-else-if="item.iconKey === 'public'" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <svg v-else-if="item.iconKey === 'private'" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="11" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.5" />
          <path d="M9 11V8a3 3 0 1 1 6 0v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 5h16v14H4V5z" stroke="currentColor" stroke-width="1.5" />
          <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </div>
      <div class="stat-body">
        <span class="stat-value">{{ item.value }}</span>
        <span class="stat-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.stat-card { display: flex; align-items: center; gap: 14px; padding: 18px 20px; background: #ffffff; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px; }
.stat-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
.stat-icon-wrap { width: 44px; height: 44px; border-radius: 10px; background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.stat-value { font-size: 22px; font-weight: 700; color: #1a1a1a; line-height: 1.2; }
.stat-label { font-size: 12px; color: #737373; white-space: nowrap; }

@media (max-width: 768px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}
</style>
