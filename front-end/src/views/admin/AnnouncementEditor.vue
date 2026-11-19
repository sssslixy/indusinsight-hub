<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { getAdminAnnouncement, saveAdminAnnouncement } from '@/api/admin'
import { useUserStore } from '@/stores/user'
import AnnouncementPreview from './AnnouncementPreview.vue'
import BackButton from '@/components/common/BackButton.vue'
import { confirmAdminAction } from './confirmAdminAction'
const { t } = useI18n()
const route = useRoute(),
  router = useRouter(),
  user = useUserStore()
const id = computed(() => (route.params.id ? Number(route.params.id) : null))
const title = ref(''),
  content = ref(''),
  important = ref(false),
  status = ref(0),
  publishTime = ref<string | null>(null)
const loading = ref(false),
  saving = ref(false),
  error = ref(''),
  showPreview = ref(false)
const snapshot = () => JSON.stringify([title.value, content.value, important.value])
const original = ref(snapshot())
const dirty = computed(() => snapshot() !== original.value)
const valid = computed(
  () => !!title.value.trim() && title.value.length <= 200 && !!content.value.trim(),
)
const preview = computed(() =>
  showPreview.value
    ? {
        title: title.value,
        content: content.value,
        isImportant: important.value,
        publishTime: publishTime.value,
      }
    : null,
)
let generation = 0
async function load() {
  const current = ++generation
  loading.value = true
  error.value = ''
  title.value = ''
  content.value = ''
  important.value = false
  status.value = 0
  publishTime.value = null
  original.value = snapshot()
  try {
    if (id.value !== null) {
      if (!Number.isSafeInteger(id.value) || id.value <= 0) throw new Error(t('admin.failed'))
      const row = await getAdminAnnouncement(id.value)
      if (current !== generation) return
      title.value = row.title
      content.value = row.content || ''
      important.value = row.isImportant
      status.value = row.status
      publishTime.value = row.publishTime
    }
    original.value = snapshot()
  } catch (e) {
    if (current === generation) error.value = e instanceof Error ? e.message : t('admin.failed')
  } finally {
    if (current === generation) loading.value = false
  }
}
async function save(targetStatus: number) {
  if (saving.value) return
  if (!valid.value) {
    ElMessage.warning(t('admin.required'))
    return
  }
  saving.value = true
  try {
    await saveAdminAnnouncement(id.value, {
      title: title.value.trim(),
      content: content.value,
      status: targetStatus,
      isImportant: important.value ? 1 : 0,
    })
    original.value = snapshot()
    ElMessage.success(
      t(targetStatus === 1 && status.value !== 1 ? 'admin.publishedSuccess' : 'admin.saved'),
    )
    await router.push('/admin/announcements')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : t('admin.failed'))
  } finally {
    saving.value = false
  }
}
async function leave() {
  if (!user.token || user.adminAccessDenied || !dirty.value) return true
  if (saving.value) return false
  try {
    await confirmAdminAction({
      title: t('admin.unsavedTitle'),
      message: t('admin.unsaved'),
      confirmText: t('admin.confirmLeave'),
      cancelText: t('admin.keepEditing'),
    })
    return true
  } catch {
    return false
  }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onBeforeRouteLeave(leave)
onBeforeRouteUpdate(leave)
watch(() => route.params.id, load)
onMounted(() => {
  void load()
  window.addEventListener('beforeunload', beforeUnload)
})
onUnmounted(() => {
  generation++
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>
<template>
  <div class="adm-page">
    <BackButton
      class="adm-back"
      :label="t('admin.back')"
      :navigate="() => router.push('/admin/announcements')"
    />
    <section class="adm-page-heading">
      <div>
        <h1>{{ t(id === null ? 'admin.newTitle' : 'admin.editTitle') }}</h1>
        <p>{{ t('admin.editorHint') }}</p>
      </div>
      <button class="adm-button" :disabled="loading || !!error" @click="showPreview = true">
        {{ t('admin.preview') }}
      </button>
    </section>
    <div v-if="loading" class="adm-card adm-state" role="status">{{ t('admin.loading') }}</div>
    <div v-else-if="error" class="adm-card adm-state" role="alert">
      <p>{{ error }}</p>
      <button class="adm-button" @click="load">{{ t('admin.retry') }}</button>
    </div>
    <form v-else class="adm-editor-grid" @submit.prevent="save(status)">
      <section class="adm-card adm-editor-card">
        <label for="announcement-title"
          >{{ t('admin.title') }}<span class="adm-counter">{{ title.length }}/200</span></label
        ><input
          id="announcement-title"
          v-model="title"
          maxlength="200"
          :placeholder="t('admin.titlePlaceholder')"
          :disabled="saving"
          required
        /><label for="announcement-content">{{ t('admin.content') }}</label
        ><textarea
          id="announcement-content"
          v-model="content"
          :placeholder="t('admin.contentPlaceholder')"
          :disabled="saving"
          required
        />
        <p class="adm-hint">{{ t('admin.previewHint') }}</p>
      </section>
      <aside class="adm-card adm-editor-settings">
        <h2>{{ t('admin.settings') }}</h2>
        <label class="adm-check"
          ><input v-model="important" type="checkbox" :disabled="saving" />{{
            t('admin.importantLabel')
          }}</label
        >
        <p class="adm-hint">{{ t('admin.importantHint') }}</p>
        <div v-if="status === 1" class="adm-notice">{{ t('admin.liveHint') }}</div>
        <div class="adm-save-actions">
          <button
            class="adm-button"
            :class="{ 'adm-primary': status === 1 }"
            type="submit"
            :disabled="saving || !valid"
          >
            {{
              t(
                saving
                  ? 'admin.saving'
                  : status === 1
                    ? 'admin.saveUpdate'
                    : status === 0
                      ? 'admin.saveDraft'
                      : 'admin.saveChanges',
              )
            }}</button
          ><button
            v-if="status !== 1"
            class="adm-button adm-primary"
            type="button"
            :disabled="saving || !valid"
            @click="save(1)"
          >
            {{ t('admin.savePublish') }}
          </button>
        </div>
      </aside>
    </form>
    <AnnouncementPreview :announcement="preview" @close="showPreview = false" />
  </div>
</template>
