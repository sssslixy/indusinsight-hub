import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getSkillPublishLeaderboard, type SkillPublishLeaderboardResponse } from '@/api/skill'

export function useSkillPublishLeaderboard() {
  const { t } = useI18n()
  const loading = ref(false)
  const board = ref<SkillPublishLeaderboardResponse | null>(null)
  const failed = ref(false)
  const revision = ref(0)
  let sequence = 0

  const hasLoaded = computed(() => board.value !== null)
  const refreshFailed = computed(() => failed.value && hasLoaded.value)
  const error = computed(() =>
    failed.value
      ? t(refreshFailed.value ? 'skillLeaderboard.refreshFailed' : 'skillLeaderboard.loadFailed')
      : '',
  )
  const entries = computed(() => board.value?.rankingPage.list.slice(0, 100) ?? [])
  const total = computed(() => board.value?.rankingPage.total ?? 0)
  const myEntry = computed(() => board.value?.myEntry ?? null)

  async function refresh() {
    const requestSequence = ++sequence
    loading.value = true
    failed.value = false
    try {
      const response = await getSkillPublishLeaderboard({ pageNum: 1, pageSize: 100 })
      if (requestSequence !== sequence) return
      board.value = response.data
      revision.value++
    } catch {
      if (requestSequence !== sequence) return
      failed.value = true
    } finally {
      if (requestSequence === sequence) {
        loading.value = false
      }
    }
  }

  const retry = refresh

  onMounted(refresh)
  onBeforeUnmount(() => {
    sequence++
  })

  return {
    loading,
    error,
    refreshFailed,
    hasLoaded,
    entries,
    total,
    myEntry,
    revision,
    refresh,
    retry,
  }
}
