<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BackButton } from '@/components/base'

type PageMode = 'create' | 'edit'

const props = withDefaults(defineProps<{
  mode?: PageMode
  savingDraft?: boolean
  publishing?: boolean
}>(), {
  mode: 'create',
  savingDraft: false,
  publishing: false,
})

const emit = defineEmits<{
  saveDraft: []
  publish: []
}>()

const { t } = useI18n()

</script>

<template>
  <div class="page-header">
    <div class="header-content">
      <div class="title-area">
        <h1 class="page-title">{{ props.mode === 'edit' ? t('agentCreate.header.editTitle') : t('agentCreate.header.createTitle') }}</h1>
        <p class="page-subtitle">
          {{
            props.mode === 'edit'
              ? t('agentCreate.header.editSubtitle')
              : t('agentCreate.header.createSubtitle')
          }}
        </p>
      </div>
      <div class="header-actions">
        <BackButton />
        <button
          class="action-btn action-btn--outline"
          type="button"
          :disabled="props.savingDraft"
          @click="(e) => { emit('saveDraft'); (e.currentTarget as HTMLElement)?.blur() }"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M11 1H3C2.45 1 2 1.45 2 2V12C2 12.55 2.45 13 3 13H11C11.55 13 12 12.55 12 12V4L9 1H11Z"
              stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
            <path d="M9 1V4H12" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
            <path d="M9 9H5M7 6H5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
          </svg>
          {{ props.savingDraft ? t('agentCreate.header.saving') : (props.mode === 'edit' ? t('create.header.saveChanges') : t('agentCreate.header.saveDraft')) }}
        </button>
        <button
          class="action-btn action-btn--primary"
          type="button"
          :disabled="props.publishing"
          @click="(e) => { emit('publish'); (e.currentTarget as HTMLElement)?.blur() }"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5L12 7H9V12.5H5V7H2L7 1.5Z" stroke="currentColor" stroke-width="1.3"
              stroke-linejoin="round" />
          </svg>
          {{ props.publishing ? t('agentCreate.header.publishing') : t('agentCreate.header.publish') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.title-area { flex: 1; }

.page-title {
  font-size: 27px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
  font-family: inherit;
  border: 1px solid transparent;
  line-height: 1;
}

.action-btn--outline {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.14);
  color: #374151;
}
.action-btn--outline:hover {
  background: #f9fafb;
  border-color: #374151;
}

.action-btn--primary {
  background: #111827;
  border-color: #111827;
  color: #ffffff;
}
.action-btn--primary:hover {
  background: #020617;
  border-color: #020617;
}
.action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 768px) {
  .header-content { flex-direction: column; align-items: flex-start; gap: 16px; }
  .page-title { font-size: 20px; }
  .header-actions { flex-wrap: wrap; }
}
</style>
