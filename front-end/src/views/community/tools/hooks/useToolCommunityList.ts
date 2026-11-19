import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getToolCommunityList, type ToolListItem } from '@/api/tool'

export function useToolCommunityList() {
  const { t } = useI18n()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const tools = ref<ToolListItem[]>([])
  const totalCount = ref(0)
  const totalPages = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const searchKeyword = ref('')
  const selectedCategoryCode = ref<string | undefined>(undefined)
  const selectedSort = ref('latest')

  const isEmpty = computed(() => !loading.value && !error.value && tools.value.length === 0)
  const isSearchResult = computed(
    () => searchKeyword.value.trim() !== '' || !!selectedCategoryCode.value,
  )

  async function fetchList() {
    loading.value = true
    error.value = null
    try {
      const res = await getToolCommunityList({
        pageNum: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value || undefined,
        categoryCode: selectedCategoryCode.value,
        sortBy: selectedSort.value,
      })
      const data = res.data
      tools.value = data?.list || []
      totalCount.value = data?.total || 0
      totalPages.value = data?.totalPages || 0
    } catch (e: unknown) {
      const err = e as { message?: string }
      error.value = err?.message || t('community.toolsLoadFailed')
      tools.value = []
      totalCount.value = 0
      totalPages.value = 0
    } finally {
      loading.value = false
    }
  }

  function handleSearch(keyword: string, category: string, sort: string) {
    searchKeyword.value = keyword
    selectedCategoryCode.value = category === 'all' || category === '' ? undefined : category
    selectedSort.value = sort
    currentPage.value = 1
    fetchList()
  }

  function handleReset() {
    searchKeyword.value = ''
    selectedCategoryCode.value = undefined
    selectedSort.value = 'latest'
    currentPage.value = 1
    fetchList()
  }

  function handlePageChange(page: number) {
    currentPage.value = page
    fetchList()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  onMounted(() => fetchList())

  return {
    loading,
    error,
    tools,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    isEmpty,
    isSearchResult,
    handleSearch,
    handleReset,
    handlePageChange,
  }
}
