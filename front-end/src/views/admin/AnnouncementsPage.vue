<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElSelect, ElOption } from 'element-plus'
import {
  getAdminAnnouncements,
  getAdminAnnouncement,
  actOnAnnouncement,
  type AdminAnnouncement,
} from '@/api/admin'
import AnnouncementPreview from './AnnouncementPreview.vue'
import { confirmAdminAction } from './confirmAdminAction'
import HeaderIcon from '@/components/navigation/HeaderIcon.vue'

const { t } = useI18n()
const rows = ref<AdminAnnouncement[]>([])
const keyword = ref(''),
  status = ref('')
const page = ref(1),
  total = ref(0),
  pages = ref(0)
const loading = ref(false),
  busy = ref<number | null>(null),
  error = ref('')
const preview = ref<AdminAnnouncement | null>(null)
const keyboardNavigation = ref(false)
function trackKeyboardNavigation(event: KeyboardEvent) {
  if (event.key === 'Tab') keyboardNavigation.value = true
}
function trackPointerNavigation() {
  keyboardNavigation.value = false
}
let requestId = 0
const statusKey = (value: number) => ['draft', 'published', 'offline'][value] || 'draft'
const statusOptions = computed(() => [
  { value: '', label: t('admin.all') },
  ...[0, 1, 2].map((value) => ({
    value: String(value),
    label: t(`admin.${statusKey(value)}`),
  })),
])
const date = (value: string | null) => (value ? value.replace('T', ' ').slice(0, 16) : '—')
async function load() {
  const id = ++requestId
  loading.value = true
  error.value = ''
  try {
    const result = await getAdminAnnouncements(page.value, keyword.value.trim(), status.value)
    if (id !== requestId) return
    rows.value = result.list
    total.value = result.total
    pages.value = result.totalPages
    if (page.value > Math.max(1, pages.value)) {
      page.value = Math.max(1, pages.value)
      await load()
    }
  } catch (e) {
    if (id === requestId) error.value = e instanceof Error ? e.message : t('admin.failed')
  } finally {
    if (id === requestId) loading.value = false
  }
}
function search() {
  page.value = 1
  void load()
}
function move(delta: number) {
  page.value += delta
  void load()
}
async function showPreview(row: AdminAnnouncement) {
  busy.value = row.id
  try {
    preview.value = await getAdminAnnouncement(row.id)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : t('admin.failed'))
  } finally {
    busy.value = null
  }
}
async function act(row: AdminAnnouncement, action: 'publish' | 'offline' | 'delete') {
  if (busy.value !== null) return
  if (action !== 'publish') {
    try {
      await confirmAdminAction({
        title: t(action === 'delete' ? 'admin.deleteTitle' : 'admin.offlineTitle'),
        message: t(action === 'delete' ? 'admin.deleteConfirm' : 'admin.offlineConfirm'),
        subject: row.title,
        confirmText: t(action === 'delete' ? 'admin.confirmDelete' : 'admin.confirmOffline'),
        cancelText: t('admin.cancel'),
        danger: true,
      })
    } catch {
      return
    }
  }
  busy.value = row.id
  try {
    await actOnAnnouncement(row.id, action)
    ElMessage.success(t('admin.done'))
    await load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : t('admin.failed'))
  } finally {
    busy.value = null
  }
}
onMounted(() => {
  void load()
  window.addEventListener('keydown', trackKeyboardNavigation, true)
  window.addEventListener('pointerdown', trackPointerNavigation, true)
})
onUnmounted(() => {
  requestId++
  window.removeEventListener('keydown', trackKeyboardNavigation, true)
  window.removeEventListener('pointerdown', trackPointerNavigation, true)
})
</script>
<template>
  <div class="adm-page">
    <section class="adm-page-heading">
      <div>
        <div class="adm-eyebrow">{{ t('admin.console') }}</div>
        <h1>{{ t('admin.listTitle') }}</h1>
        <p>{{ t('admin.listSubtitle') }}</p>
      </div>
      <RouterLink class="adm-button adm-primary" to="/admin/announcements/new">
        <svg
          class="adm-button-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
        {{ t('admin.new') }}
      </RouterLink>
    </section>
    <section class="adm-card">
      <form class="adm-toolbar" @submit.prevent="search">
        <div class="adm-search">
          <input
            v-model="keyword"
            :aria-label="t('admin.search')"
            :placeholder="t('admin.search')"
            type="search"
          /><button class="adm-button" type="submit">{{ t('admin.searchAction') }}</button>
        </div>
        <ElSelect
          v-model="status"
          class="adm-status-select"
          :class="{ 'adm-keyboard-focus': keyboardNavigation }"
          popper-class="adm-status-options"
          :aria-label="t('admin.status')"
          :empty-values="[null, undefined]"
          :show-arrow="false"
          :offset="8"
          @change="search"
        >
          <ElOption
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          >
            <span>{{ option.label }}</span>
            <HeaderIcon v-if="status === option.value" name="check" />
          </ElOption>
        </ElSelect>
      </form>
      <div v-if="loading" class="adm-state" role="status">
        <span class="adm-spinner" />{{ t('admin.loading') }}
      </div>
      <div v-else-if="error" class="adm-state" role="alert">
        <p>{{ error }}</p>
        <button class="adm-button" @click="load">{{ t('admin.retry') }}</button>
      </div>
      <div v-else-if="!rows.length" class="adm-state">
        <div class="adm-empty-icon" aria-hidden="true">≡</div>
        <h2>{{ t(keyword || status ? 'admin.noResults' : 'admin.empty') }}</h2>
        <p>{{ t(keyword || status ? 'admin.noResultsHint' : 'admin.emptyHint') }}</p>
        <RouterLink v-if="!keyword && !status" class="adm-button" to="/admin/announcements/new">{{
          t('admin.new')
        }}</RouterLink>
      </div>
      <div v-else class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>{{ t('admin.title') }}</th>
              <th>{{ t('admin.status') }}</th>
              <th>{{ t('admin.publishedAt') }}</th>
              <th>{{ t('admin.updatedAt') }}</th>
              <th>{{ t('admin.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td class="adm-title-cell">
                <RouterLink :to="`/admin/announcements/${row.id}/edit`">{{ row.title }}</RouterLink
                ><span v-if="row.isImportant" class="adm-important">{{
                  t('admin.important')
                }}</span>
                <p>{{ row.contentSummary }}</p>
              </td>
              <td>
                <span :class="['adm-badge', `adm-status-${row.status}`]">{{
                  t(`admin.${statusKey(row.status)}`)
                }}</span>
              </td>
              <td class="adm-date" :data-label="t('admin.publishedAt')">
                {{ date(row.publishTime) }}
              </td>
              <td class="adm-date" :data-label="t('admin.updatedAt')">{{ date(row.updatedAt) }}</td>
              <td>
                <div class="adm-row-actions">
                  <RouterLink :to="`/admin/announcements/${row.id}/edit`">{{
                    t('admin.edit')
                  }}</RouterLink
                  ><button :disabled="busy !== null" @click="showPreview(row)">
                    {{ t('admin.preview') }}</button
                  ><button
                    v-if="row.status !== 1"
                    :disabled="busy !== null"
                    @click="act(row, 'publish')"
                  >
                    {{ t('admin.publish') }}</button
                  ><button v-else :disabled="busy !== null" @click="act(row, 'offline')">
                    {{ t('admin.takeOffline') }}</button
                  ><button class="adm-danger" :disabled="busy !== null" @click="act(row, 'delete')">
                    {{ t('admin.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer class="adm-pagination">
        <span>{{ t('admin.page', { page, total }) }}</span>
        <div>
          <button class="adm-button" :disabled="loading || page <= 1" @click="move(-1)">
            {{ t('admin.previous') }}</button
          ><button class="adm-button" :disabled="loading || page >= pages" @click="move(1)">
            {{ t('admin.next') }}
          </button>
        </div>
      </footer>
    </section>
    <AnnouncementPreview :announcement="preview" @close="preview = null" />
  </div>
</template>
