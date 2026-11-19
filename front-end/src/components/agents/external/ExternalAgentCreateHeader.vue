<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const props = withDefaults(
  defineProps<{
    savingDraft?: boolean
    publishing?: boolean
    /** 路由带 agentId，编辑/回显态 */
    isEditMode?: boolean
    /** 正在拉取详情 */
    detailLoading?: boolean
  }>(),
  {
    savingDraft: false,
    publishing: false,
    isEditMode: false,
    detailLoading: false,
  },
)

const emit = defineEmits<{
  saveDraft: []
  publish: []
}>()

const router = useRouter()
const { t } = useI18n()
const handleBack = () => router.push('/dashboard')
</script>

<template>
  <div class="page-header">
    <div class="header-content">
      <div class="title-area">
        <h1 class="page-title">
          {{ isEditMode ? t('externalAgent.header.editTitle') : t('externalAgent.header.createTitle') }}
        </h1>
        <p class="page-subtitle">
          <template v-if="detailLoading">{{ t('externalAgent.header.loadingDetail') }}</template>
          <template v-else-if="isEditMode">
            {{ t('externalAgent.header.editSubtitle') }}
          </template>
          <template v-else>
            {{ t('externalAgent.header.createSubtitle') }}
          </template>
        </p>
      </div>
      <div class="header-actions">
        <button type="button" class="action-btn action-btn--ghost" @click="handleBack">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M12 7.5H3M3 7.5L6.5 4M3 7.5L6.5 11"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ t('externalAgent.header.backWorkbench') }}
        </button>
        <button
          type="button"
          class="action-btn action-btn--outline"
          :disabled="savingDraft || detailLoading"
          @click="(e) => { emit('saveDraft'); (e.currentTarget as HTMLElement)?.blur() }"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path
              d="M11 1H3C2.45 1 2 1.45 2 2V12C2 12.55 2.45 13 3 13H11C11.55 13 12 12.55 12 12V4L9 1H11Z"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linejoin="round"
            />
            <path d="M9 1V4H12" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
            <path d="M9 9H5M7 6H5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
          </svg>
          {{ savingDraft ? t('externalAgent.header.saving') : t('externalAgent.header.saveDraft') }}
        </button>
        <button
          type="button"
          class="action-btn action-btn--primary"
          :disabled="publishing || detailLoading"
          @click="emit('publish')"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5L12 7H9V12.5H5V7H2L7 1.5Z"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linejoin="round"
            />
          </svg>
          {{ publishing ? t('externalAgent.header.publishing') : t('externalAgent.header.publish') }}
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

.title-area {
  flex: 1;
}

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

.action-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.action-btn--ghost {
  background: transparent;
  border-color: rgba(0, 0, 0, 0.11);
  color: #6b7280;
}

.action-btn--ghost:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #374151;
  color: #1f2937;
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

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .page-title {
    font-size: 20px;
  }

  .header-actions {
    flex-wrap: wrap;
  }
}
</style>
