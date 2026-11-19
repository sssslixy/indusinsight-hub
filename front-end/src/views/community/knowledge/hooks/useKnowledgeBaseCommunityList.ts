import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getKnowledgeBaseCommunityList,
  type KnowledgeBaseCommunitySortBy,
  type MyKnowledgeBaseItem,
} from '@/api/knowledgeBase'

export function useKnowledgeBaseCommunityList() {
  const { t } = useI18n()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const items = ref<MyKnowledgeBaseItem[]>([])
  const totalCount = ref(0)
  const totalPages = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const searchKeyword = ref('')
  const selectedSort = ref<KnowledgeBaseCommunitySortBy>('latest')

  const isEmpty = computed(() => !loading.value && !error.value && items.value.length === 0)
  const isSearchResult = computed(() => searchKeyword.value.trim() !== '')

  async function fetchList() {
    loading.value = true
    error.value = null
    try {
      const res = await getKnowledgeBaseCommunityList({
        includeMine: true,
        pageNum: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value.trim() || undefined,
        sortBy: selectedSort.value,
      })
      const data = res.data
      items.value = data?.list || []
      totalCount.value = data?.total || 0
      totalPages.value = data?.totalPages || 0
    } catch (e: unknown) {
      const err = e as { message?: string }
      error.value = err?.message || t('community.knowledgeBasesLoadFailed')
      items.value = []
      totalCount.value = 0
      totalPages.value = 0
    } finally {
      loading.value = false
    }
  }

  function handleSearch(keyword: string, sort: string) {
    searchKeyword.value = keyword
    selectedSort.value = (sort || 'latest') as KnowledgeBaseCommunitySortBy
    currentPage.value = 1
    fetchList()
  }

  function handleReset() {
    searchKeyword.value = ''
    selectedSort.value = 'latest'
    currentPage.value = 1
    fetchList()
  }

  function handlePageChange(page: number) {
    currentPage.value = page
    fetchList()
  }

  return {
    loading,
    error,
    items,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    isEmpty,
    isSearchResult,
    fetchList,
    handleSearch,
    handleReset,
    handlePageChange,
  }
}
