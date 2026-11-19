<script setup lang="ts">
import { BackButton } from '@/components/base'
import { useI18n } from 'vue-i18n'

type PageMode = 'create' | 'edit'

const props = withDefaults(
  defineProps<{
    /** 页面主体文案，如 Skill、tool */
    entityLabel?: string
    mode?: PageMode
    savingDraft?: boolean
    publishingSkill?: boolean
    /** 从社区进入的只读查看，不显示保存/发布 */
    readOnly?: boolean
    showFavorite?: boolean
    isFavorited?: boolean
    favoriteLoading?: boolean
    submitDisabled?: boolean
    submitDisabledReason?: string
  }>(),
  {
    entityLabel: 'Skill',
    mode: 'create',
    savingDraft: false,
    publishingSkill: false,
    readOnly: false,
    showFavorite: false,
    isFavorited: false,
    favoriteLoading: false,
    submitDisabled: false,
    submitDisabledReason: '',
  },
)

const emit = defineEmits<{
  saveDraft: []
  publish: []
  favorite: []
}>()

const { t } = useI18n()

</script>

<template>
  <div class="page-header">
    <div class="header-content">
      <div class="title-area">
        <h1 class="page-title">
          {{
            readOnly
              ? t('create.header.viewEntity', { entity: props.entityLabel })
              : props.mode === 'edit'
                ? t('create.header.editEntity', { entity: props.entityLabel })
                : t('create.header.createEntity', { entity: props.entityLabel })
          }}
        </h1>
        <p class="page-subtitle">
          {{
            readOnly
              ? t('create.header.readonlySubtitle')
              : props.mode === 'edit'
                ? props.entityLabel === 'tool'
                  ? t('create.header.editToolSubtitle')
                  : t('create.header.editSkillSubtitle')
                : props.entityLabel === 'tool'
                  ? t('create.header.createToolSubtitle')
                  : t('create.header.createSkillSubtitle')
          }}
        </p>
      </div>
      <div class="header-actions">
        <BackButton />
        <button
          v-if="showFavorite"
          class="action-btn action-btn--ghost action-btn--favorite"
          type="button"
          :disabled="favoriteLoading"
          @click="emit('favorite')"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            :class="{ 'icon-filled': isFavorited }"
          >
            <path
              d="M7.5 2L9.2 5.5L13 6L10.2 8.7L10.9 12.5L7.5 10.6L4.1 12.5L4.8 8.7L2 6L5.8 5.5L7.5 2Z"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linejoin="round"
              :fill="isFavorited ? 'currentColor' : 'none'"
            />
          </svg>
          {{ isFavorited ? t('create.common.unfavorite') : t('create.common.favorite') }}
        </button>
        <template v-if="!readOnly">
          <button
            class="action-btn action-btn--outline"
            type="button"
            :disabled="savingDraft || submitDisabled"
            :title="submitDisabled ? submitDisabledReason : ''"
            @click="(e) => { emit('saveDraft'); (e.currentTarget as HTMLElement)?.blur() }"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M11 1H3C2.45 1 2 1.45 2 2V12C2 12.55 2.45 13 3 13H11C11.55 13 12 12.55 12 12V4L9 1H11Z"
                stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
              <path d="M9 1V4H12" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
              <path d="M9 9H5M7 6H5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            </svg>
            {{ savingDraft ? t('create.header.saving') : (props.mode === 'edit' ? t('create.header.saveChanges') : t('create.header.saveDraft')) }}
          </button>
          <button
            class="action-btn action-btn--primary"
            type="button"
            :disabled="publishingSkill || submitDisabled"
            :title="submitDisabled ? submitDisabledReason : ''"
            @click="emit('publish')"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L12 7H9V12.5H5V7H2L7 1.5Z" stroke="currentColor" stroke-width="1.3"
                stroke-linejoin="round" />
            </svg>
            {{ publishingSkill ? t('create.header.publishing') : t('create.header.publishEntity', { entity: props.entityLabel }) }}
          </button>
        </template>
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

.action-btn--favorite .icon-filled,
.action-btn--favorite.icon-filled {
  color: #eab308;
}
.action-btn--favorite:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 768px) {
  .header-content { flex-direction: column; align-items: flex-start; gap: 16px; }
  .page-title { font-size: 20px; }
  .header-actions { flex-wrap: wrap; }
}
</style>
