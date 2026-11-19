<script setup lang="ts">
import { computed } from 'vue'
import { ElDialog } from 'element-plus'
import { useI18n } from 'vue-i18n'
import AnnouncementContentCard from '@/components/announcements/AnnouncementContentCard.vue'
import type { AdminAnnouncement } from '@/api/admin'
const props = defineProps<{
  announcement: Pick<AdminAnnouncement, 'title' | 'content' | 'publishTime' | 'isImportant'> | null
}>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const isLatest = computed(() => {
  if (!props.announcement?.publishTime) return false
  const published = new Date(props.announcement.publishTime)
  const today = new Date()
  published.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const days = (today.getTime() - published.getTime()) / 86400000
  return days >= 0 && days <= 3
})
</script>
<template>
  <ElDialog
    :model-value="!!announcement"
    :title="t('admin.previewTitle')"
    class="adm-preview-dialog"
    modal-class="adm-dialog-overlay"
    width="min(880px, 94vw)"
    top="24px"
    append-to-body
    destroy-on-close
    @update:model-value="
      (value) => {
        if (!value) emit('close')
      }
    "
  >
    <div v-if="announcement" class="adm-preview-content">
      <p v-if="!announcement.publishTime" class="adm-preview-note">{{ t('admin.unpublished') }}</p>
      <AnnouncementContentCard
        :title="announcement.title || t('admin.untitled')"
        :content="announcement.content || ''"
        :publish-time="announcement.publishTime || ''"
        :is-latest="isLatest"
        :is-important="announcement.isImportant"
      />
    </div>
  </ElDialog>
</template>
