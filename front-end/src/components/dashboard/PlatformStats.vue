<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDashboardStats, type DashboardStats } from '@/api/dashboard'
import { waitForPlatformVisit } from '@/composables/platformVisits'

const { t, locale } = useI18n()
const loading = ref(true)
const data = ref<DashboardStats | null>(null)
const controller = new AbortController()
let timeout: ReturnType<typeof setTimeout> | undefined
const countUnits = [
  ['k', 1_000n],
  ['M', 1_000_000n],
  ['B', 1_000_000_000n],
  ['T', 1_000_000_000_000n],
] as const

function formatCount(value: number | string | null | undefined) {
  const validNumber = typeof value === 'number' && Number.isInteger(value) && value >= 0
  const validString = typeof value === 'string' && /^\d+$/.test(value)
  if (!validNumber && !validString) return { display: '--', full: t('dashboard.statsUnavailable') }

  const count = BigInt(value)
  const full = count.toLocaleString(locale.value)
  if (count < 1_000n) return { display: full, full }

  let display = full
  for (const [suffix, scale] of countUnits) {
    // Round from the original count at each scale, including when 999.95k becomes 1M.
    const tenths = (count * 10n + scale / 2n) / scale
    if (tenths >= 10_000n && suffix !== 'T') continue
    const whole = tenths / 10n
    const fraction = tenths % 10n
    display = `${whole}${fraction ? '.' + fraction : ''}${suffix}`
    break
  }
  return { full, display }
}

const items = computed(() => [
  { key: 'totalAgents', value: data.value?.totalAgents, hint: 'totalAgentsHint' },
  { key: 'totalSkills', value: data.value?.totalSkills, hint: 'totalSkillsHint' },
  { key: 'totalDocuments', value: data.value?.totalDocuments, hint: 'totalDocumentsHint' },
  { key: 'totalVisits', value: data.value?.totalVisits, hint: 'totalVisitsHint' },
  { key: 'totalTokens', value: data.value?.totalTokens, hint: 'totalTokensHint' },
].map(item => {
  const { full, display } = formatCount(item.value)
  return {
    ...item,
    full: loading.value ? t('common.loading') : full,
    display,
  }
}))

onMounted(async () => {
  try {
    await waitForPlatformVisit()
    if (controller.signal.aborted) return
    timeout = setTimeout(() => controller.abort(), 5_000)
    const response = await getDashboardStats(controller.signal)
    if (!controller.signal.aborted) data.value = response.data
  } catch {
    // Each unavailable value stays distinct from a real zero; no business toast.
  } finally {
    clearTimeout(timeout)
    loading.value = false
  }
})

onUnmounted(() => {
  clearTimeout(timeout)
  controller.abort()
})
</script>

<template>
  <dl class="platform-stats" :aria-label="t('dashboard.platformStats')" :aria-busy="loading">
    <div v-for="item in items" :key="item.key" class="info-card">
      <dt class="info-label">{{ t(`dashboard.${item.key}`) }}</dt>
      <dd class="info-value" :class="{ 'is-loading': loading }" :style="{ '--stat-length': item.display.length }" :title="item.full" :aria-label="item.full">
        {{ item.display }}
      </dd>
      <dd class="stats-sr-only">{{ t(`dashboard.${item.hint}`) }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.platform-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  width: 100%;
  min-width: 0;
  margin: 0;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.025);
  overflow: hidden;
}
.info-card {
  grid-column: span 2;
  container-type: inline-size;
  min-width: 0;
  min-height: 92px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12px 10px;
  text-align: center;
  overflow-wrap: anywhere;
}
.info-card:nth-child(n + 4) {
  grid-column: span 3;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.info-card:not(:nth-child(3)):not(:last-child) {
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}
.info-label {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  font-size: 12px;
  color: #737373;
  line-height: 16px;
}
.info-value {
  align-self: center;
  max-width: 100%;
  min-width: 0;
  margin: 4px 0 0;
  font-size: 26px;
  /* Fit long counts even above the largest supported unit. */
  font-size: min(26px, calc(150cqw / var(--stat-length, 1)));
  line-height: 32px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.is-loading { color: #a3a3a3; }
.stats-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
